# Design Spec

## Current-State Read

The backend can store nested agent-team definitions but the mixed execution path is still flat. `AgentTeamDefinition.nodes` allows `refType: "agent_team"`, and GraphQL exposes that shape. However team-run launch currently expands nested definitions into leaf agent configs through `TeamDefinitionTraversalService.collectLeafAgentMembers()`. `TeamRunConfig.memberConfigs`, `MixedTeamMemberContext`, `TeamRunMemberMetadata`, and `MixedTeamManager` all assume every executable team member is an agent run.

The mixed runtime spine today is:

`TeamRunService -> AgentTeamRunManager -> MixedTeamRunBackendFactory -> MixedTeamRunBackend -> MixedTeamManager -> AgentRunManager -> AgentRun`

That path cannot make a top-level member be another team. The only nested runtime implementation in the repository is AutoByteus-native: AutoByteus-ts has `ManagedNode = Agent | AgentTeam`, lazy subteam creation, event bridging, and subteam shutdown; the server AutoByteus backend hydrates nested `AgentTeamConfig`s and converts native `SUB_TEAM` events. The mixed backend needs the same ownership shape using server `AgentRun | TeamRun` abstractions.

## Intended Change

Make the mixed team manager the authoritative nested-team execution path by introducing recursive mixed-team topology, discriminated member config/context/metadata, and a mixed runtime-member boundary. A mixed team member can be either:

- an `agent` member handle backed by `AgentRun`, or
- an `agent_team` member handle backed by an internal child `TeamRun`.

New runs whose definitions contain nested `agent_team` nodes should route to `TeamBackendKind.MIXED`, even when every leaf agent uses the same runtime kind. This is a deliberate semantics change for new nested launches: the old flatten-to-leaves behavior is not preserved as an execution mode for nested definitions. Single-runtime team managers remain in the codebase for non-nested teams but do not own the new nested execution behavior.

## Design-Owner Recheck Decisions

Architecture review paused for design-owner confirmation. The refined decisions are:

1. **Nested backend selection:** any newly launched definition containing `agent_team` nodes routes to `TeamBackendKind.MIXED`. The previous flattening behavior remains only a description of current/legacy behavior, not a compatibility mode for new nested launches.
2. **Child run ownership:** child team member handles are parent-owned internal `TeamRun` instances created by `MixedSubTeamRunFactory`; they are not registered as top-level active/history runs through `AgentTeamRunManager`. A team definition launched directly by the user still creates a normal top-level run.
3. **Metadata schema policy:** use one canonical recursive `TeamRunMetadata` schema. Do not introduce a version-suffixed metadata type and do not keep a `runVersion` field. Legacy flat metadata must never be guessed back into nested topology; restore should fail with an explicit unsupported legacy-metadata/topology-lost error.
4. **Event identity:** `TeamRunEvent.sourcePath` is the single canonical runtime-source identity. `memberRouteKey`, `source_route_key`, `sub_team_node_name`, display names, and other aliases are derived from `sourcePath` only at transport/projection edges.
5. **Command/tool approval identity:** GraphQL, WebSocket, and tool-approval command paths must use a `TeamMemberSelector` shape (`memberPath` or `memberRouteKey`; bare `memberName` only for top-level or unambiguous team-boundary use). Tool approval request events must include `sourcePath` so approval can target the exact nested leaf.
6. **Naming:** Use `TeamMemberNode` / `TeamMemberTreeNode` for frontend or definition tree data. Use `MixedTeamMemberHandle` for backend live command/lifecycle adapters. Avoid `TeamRuntimeNode`; `runtime` stays only where it describes actual runtime state, such as `TeamRunContext` or `runtimeKind`.


## Architecture Review Round 7 Rework Decisions

The independent architecture review found three design-impact gaps. The following decisions are authoritative implementation guidance and supersede any looser wording elsewhere in this document.

### ARCH-NESTED-001 Resolution: Selector Is The Public Command Boundary

`TeamMemberSelector` is not only a mixed-manager helper. It is the authoritative command target identity across the domain/backend command chain.

Target command shape:

```ts
type TeamMemberSelector =
  | { kind: 'path'; memberPath: string[] }
  | { kind: 'route_key'; memberRouteKey: string }
  | { kind: 'top_level_name'; memberName: string };
```

Rules:

- `memberPath` and `memberRouteKey` are canonical for nested targets.
- `top_level_name` is allowed only for top-level members or current-team-boundary unambiguous adapter use.
- Transport payload strings such as `target_member_name`, `agent_name`, or existing GraphQL string fields are edge input only. Transport/resolver code must immediately convert them to `TeamMemberSelector` using `team-run-member-identity.ts` helpers.
- `TeamRun.postMessage`, `TeamRun.approveToolInvocation`, `TeamRunBackend`, and `TeamManager` must accept selector-bearing signatures. Raw strings must not remain the core domain/backend command shape.
- Single-runtime team managers that remain flat may resolve only top-level selectors and reject nested path selectors clearly. Mixed owns nested selector routing.

Target signatures:

```ts
class TeamRun {
  postMessage(message: AgentInputUserMessage, target?: TeamMemberSelector | null): Promise<AgentOperationResult>;
  approveToolInvocation(target: TeamMemberSelector, invocationId: string, approved: boolean, reason?: string | null): Promise<AgentOperationResult>;
}

interface TeamRunBackend {
  postMessage(message: AgentInputUserMessage, target?: TeamMemberSelector | null): Promise<AgentOperationResult>;
  approveToolInvocation(target: TeamMemberSelector, invocationId: string, approved: boolean, reason?: string | null): Promise<AgentOperationResult>;
}

interface TeamManager {
  postMessage(message: AgentInputUserMessage, target: TeamMemberSelector): Promise<AgentOperationResult>;
  approveToolInvocation(target: TeamMemberSelector, invocationId: string, approved: boolean, reason?: string | null): Promise<AgentOperationResult>;
}
```

`TeamRun.resolvePostMessageTarget()` should return a selector for the coordinator/default member, not a raw member-name string.

### ARCH-NESTED-002 Resolution: Metadata Store And Derived Projection Ownership

`TeamRunMetadataStore` is part of the authoritative metadata boundary. It must not remain a flat-schema validator.

Target storage responsibilities:

- `team-run-metadata-types.ts` defines canonical recursive `TeamRunMetadata` and `TeamRunMemberMetadata` discriminated unions.
- `team-run-metadata-store.ts` validates, normalizes, reads, and writes only canonical recursive metadata with `memberTree`.
- `team-run-metadata-store.ts` removes support for `runVersion` and top-level flat `memberMetadata` as valid schema fields.
- If a stored payload has old flat markers such as `memberMetadata` or `runVersion`, the store throws or reports an explicit unsupported legacy-metadata/topology-lost error. It must not silently return `null`, migrate, fallback-read, dual-read, or infer topology.
- `team-run-metadata-mapper.ts` maps runtime config/context to canonical recursive metadata and restore context. It does not validate JSON file shape directly.

Derived flat consumers must use a single owned flattener:

```ts
team-run-metadata-flattener.ts
```

Responsibilities:

- derive leaf-agent metadata rows from `TeamRunMetadata.memberTree` for existing history/member projection code;
- derive top-level member summaries including `agent_team` nodes for run-history displays;
- never act as a compatibility reader for historical flat metadata.

Concrete consumers to update from `metadata.memberMetadata` to flattener helpers:

- `run-history/services/team-run-history-index-service.ts`
- `run-history/services/team-run-history-service.ts`
- `run-history/services/team-member-run-view-projection-service.ts`
- `run-history/services/run-file-change-projection-service.ts`
- `agent-team-execution/services/team-run-runtime-context-support.ts`
- any GraphQL/run-history DTO mappers that expose team members

### ARCH-NESTED-003 Resolution: Team Communication Is Member-Kind And Path Aware

Parent-to-subteam communication is not an agent-to-agent shortcut. It is a parent team communication from one member to another member whose kind may be `agent_team`.

Update `MemberTeamDescriptor` to a discriminated member descriptor:

```ts
type MemberTeamDescriptor =
  | {
      memberKind: 'agent';
      memberName: string;
      memberPath: string[];
      memberRouteKey: string;
      memberRunId: string;
      runtimeKind: RuntimeKind;
      role: string | null;
      description: string | null;
    }
  | {
      memberKind: 'agent_team';
      memberName: string;
      memberPath: string[];
      memberRouteKey: string;
      memberRunId: string;
      teamDefinitionId: string;
      coordinatorMemberRouteKey: string | null;
      role: string | null;
      description: string | null;
    };
```

Update inter-member delivery request shape:

```ts
interface InterAgentMessageDeliveryRequest {
  senderRunId: string;
  senderSelector?: TeamMemberSelector | null;
  senderMemberName?: string | null; // display only
  senderPath?: string[] | null;
  senderRouteKey?: string | null;
  teamRunId: string;
  recipientSelector: TeamMemberSelector;
  recipientMemberName?: string | null; // display only
  recipientPath?: string[] | null;
  recipientRouteKey?: string | null;
  content: string;
  messageType?: string | null;
  referenceFiles?: string[] | null;
}
```

`MixedTeamManager.deliverInterAgentMessage()` resolves the recipient selector inside the parent team boundary, publishes one parent-level communication event, and delegates delivery to the resolved member handle:

- agent recipient handle: post the recipient-visible message to `AgentRun`;
- subteam recipient handle: create/restore the internal child `TeamRun`, post to the child team default/coordinator target, and do not expose child coordinator as a parent recipient.

Add a member-kind-aware team communication event payload instead of relying only on agent-shaped `TEAM_COMMUNICATION_MESSAGE` agent events:

```ts
type TeamRunCommunicationEventPayload = {
  messageId: string;
  teamRunId: string;
  sender: TeamCommunicationParticipant;
  receiver: TeamCommunicationParticipant;
  content: string;
  messageType: string;
  referenceFiles: TeamCommunicationReferenceFile[];
  createdAt: string;
};

type TeamCommunicationParticipant = {
  memberKind: 'agent' | 'agent_team';
  memberName: string;
  memberPath: string[];
  memberRouteKey: string;
  memberRunId: string;
  platformRunId?: string | null;
  teamDefinitionId?: string | null;
};
```

`TeamRunEvent.sourcePath` for the parent communication event is the sender path. The receiver path lives in the communication payload.

`TeamCommunicationService` must consume the member-kind-aware team communication event and write a projection with sender/receiver path/route/member-kind. It must not fake an `agent_team` receiver as an agent runtime. Existing agent-shaped communication events can be removed/replaced for mixed nested communication; do not add a compatibility wrapper as the authoritative path.

Concrete example:

```text
Parent team: EngineeringTeam
Members: Coordinator(agent), CodeReviewTeam(agent_team)
Action: Coordinator send_message_to CodeReviewTeam
```

Parent projection event:

```json
{
  "sourcePath": ["Coordinator"],
  "sender": { "memberKind": "agent", "memberRouteKey": "Coordinator" },
  "receiver": { "memberKind": "agent_team", "memberRouteKey": "CodeReviewTeam" },
  "content": "Please review this PR"
}
```

Child processing appears separately through the child event bridge, for example:

```json
{
  "sourcePath": ["CodeReviewTeam", "ReviewLead"],
  "data": { "memberName": "ReviewLead", "agentEvent": "..." }
}
```


## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / Larger Requirement
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue; Shared Structure Looseness
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: Current mixed manager owns `Map<string, AgentRun>` and `ensureMemberReady(): Promise<AgentRun>`; current run config and metadata require agent-only fields; current launch traversal flattens nested teams.
- Design response: Introduce recursive team topology planning and make `MixedTeamManager` own member handles instead of `AgentRun`s directly.
- Refactor rationale: Adding an `if subteam` branch inside the current agent-only maps would violate the authoritative boundary rule and spread agent/team distinctions across launch, runtime, events, and restore.
- Intentional deferrals and residual risk, if any: Full frontend tree visualization and direct child-to-parent/cross-level messaging are deferred. Backend event identity is designed to support future UI tree rendering.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.
- `TeamMemberNode`: a tree/data node used for definition topology and frontend display. It is a noun/data shape, not a live object with command methods.
- `Mixed team member handle`: one executable member handle managed by `MixedTeamManager`; either an agent member handle or a subteam member handle. Use `handle` for live lifecycle/command adapters instead of `node` or `runtime node`.
- `TeamRunMemberMetadata`: metadata for one entry in `TeamRunMetadata.memberTree`; use this name for the recursive member union instead of `TeamRunMemberMetadataNode`. The `memberTree` property already says these entries form a tree.
- `Member path`: string array from the current team root to the member, e.g. `['EngineeringDept', 'CodeReviewTeam', 'Reviewer']`.
- `Member route key`: normalized slash-delimited route key derived from member path, e.g. `EngineeringDept/CodeReviewTeam/Reviewer`.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility and no legacy restore paths for this change.`
- Required action: replace flat-only team-run config/metadata as the authoritative mixed nested representation. Do not preserve a mixed nested execution mode that flattens subteams into leaf agents.
- Existing single-runtime flat managers may stay for non-nested teams, but they must not be used as the nested-team implementation.
- Canonical recursive `TeamRunMetadata` is the only authoritative restore schema. Do not add a version-suffixed metadata type or `runVersion`. Do not retain dual schemas, migrations, fallback readers, topology guessing from current definitions, or recovery paths for old flat metadata; unsupported historical metadata fails fast with a clear error.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Team run creation request | Mixed runtime topology context | `TeamRunService` with `TeamDefinitionTopologyPlanner` | Preserves nested definitions before runtime creation. |
| DS-002 | Primary End-to-End | User/agent message to parent member | Agent or child team receives work | `MixedTeamManager` | Core nested dispatch path. |
| DS-003 | Return-Event | Child agent/team event | Parent team stream/listeners | `MixedTeamEventBridge` under `MixedTeamManager` | Makes nested activity observable with path attribution. |
| DS-004 | Primary End-to-End | Restore team run | Restored parent and child runtime graph | `TeamRunMetadataMapper` + `MixedTeamRunBackendFactory` | Prevents loss of child team state. |
| DS-005 | Bounded Local | Parent interrupt/terminate | All active members stopped | `MixedTeamManager` | Prevents orphaned child agents/teams. |

## Primary Execution Spine(s)

- Launch topology spine: `GraphQL / Application / External Channel -> TeamRunService -> TeamDefinitionTopologyPlanner -> TeamRunConfig tree -> AgentTeamRunManager -> MixedTeamRunBackendFactory -> MixedTeamManager`
- Nested message dispatch spine: `TeamRun.postMessage / send_message_to -> MixedTeamRunBackend -> MixedTeamManager -> MixedTeamMemberRegistry -> MixedSubTeamMemberHandle -> Child TeamRun -> Child MixedTeamManager -> Child Agent Runtime Member`
- Restore spine: `TeamRunService.restoreTeamRun -> TeamRunMetadataMapper -> Recursive TeamRunContext -> MixedTeamRunBackendFactory -> MixedTeamManager -> Member handles on demand`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A create-run request enters with a team definition and launch settings. The planner loads the definition graph, validates it, assigns member paths/route keys, maps leaf launch configs, and produces a recursive config tree. The manager selection chooses mixed for nested definitions and creates a mixed backend/context. | Run request, topology planner, recursive config, mixed backend | `TeamRunService` for orchestration; planner for graph resolution | Definition lookup, workspace normalization, launch config matching, backend-kind decision |
| DS-002 | A message targeted at a top-level member is resolved to an agent or subteam runtime handle. Agent handles post to `AgentRun`; subteam handles create/restore a child `TeamRun` and post to its default coordinator. | TeamRun, MixedTeamManager, member handle, AgentRun/TeamRun | `MixedTeamManager` | Member lookup, child factory, inter-member message normalization |
| DS-003 | Agent and child team events are consumed by member handles and rewritten into parent team events with source path and member identity preserved. | Child event source, event bridge, parent event publisher | `MixedTeamManager` via event bridge | Event pipeline, websocket mapping, history/projection consumers |
| DS-004 | Restore reads recursive metadata and reconstructs recursive contexts without flattening. Members are restored lazily with stored platform IDs or child team run IDs. | Metadata mapper, recursive context, mixed backend factory | `TeamRunMetadataMapper` | Workspace lookup, memory path reconstruction, metadata shape validation |
| DS-005 | Parent termination iterates active runtime handles and stops each, cascading into child team handles before clearing subscriptions/maps. | MixedTeamManager, member handles | `MixedTeamManager` | Subscription cleanup, error aggregation |

## Spine Actors / Main-Line Nodes

- `TeamRunService`
- `TeamDefinitionTopologyPlanner`
- `TeamRunConfig` recursive member tree
- `AgentTeamRunManager`
- `MixedTeamRunBackendFactory`
- `MixedTeamRunBackend`
- `MixedTeamManager`
- `MixedTeamMemberHandle` (`MixedAgentMemberHandle` / `MixedSubTeamMemberHandle`)
- `AgentRun` / child `TeamRun`
- `TeamRunMetadataMapper`

## Ownership Map

| Node | Owns |
| --- | --- |
| `TeamRunService` | Top-level run creation/restore orchestration, workspace normalization, metadata/history writes for top-level runs only. |
| `TeamDefinitionTopologyPlanner` | Recursive definition loading, cycle validation, coordinator-type validation, member path/route-key derivation, leaf launch config matching. |
| `TeamRunConfig` | Immutable executable run plan, including discriminated member configs. |
| `MixedTeamRunBackendFactory` | Converting recursive config/context into a mixed backend and manager. |
| `MixedTeamManager` | Member handle lifecycle, routing, status derivation, event publication, lifecycle cascade for one mixed team run. |
| `MixedTeamMemberHandle` | Common command/event/status contract for one executable member. |
| `MixedAgentMemberHandle` | AgentRun creation/restore, agent message delivery, tool approval, agent event subscription. |
| `MixedSubTeamMemberHandle` | Parent-owned internal child `TeamRun` creation/restore, default child-team message delivery, child event subscription, child lifecycle. |
| `TeamRunMetadataMapper` | Recursive team-run metadata projection and restore context construction. |

If `MixedTeamRunBackend` remains a public runtime facade, it is a thin entry wrapper; `MixedTeamManager` is the governing owner behind it.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `MixedTeamRunBackend` | `MixedTeamManager` | Adapts common `TeamRunBackend` API to mixed manager commands. | Member handle creation, routing policy, event bridging. |
| GraphQL `createAgentTeamRun` mutation | `TeamRunService` | Transport entrypoint. | Topology planning or backend selection. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Flat-only mixed member assumption (`MixedTeamManager.memberRuns`, `ensureMemberReady(): AgentRun`) | Cannot represent subteam members. | `MixedTeamMemberRegistry` + `MixedTeamMemberHandle` member handles. | In This Change | Rename/remove agent-only maps. |
| Flat launch traversal as execution topology (`collectLeafAgentMembers` used as run plan) | Loses subteam boundaries. | `TeamDefinitionTopologyPlanner`. | In This Change | A leaf collector can remain only as a view/helper if not authoritative. |
| Agent-only `TeamMemberRunConfig` as universal member shape | Forces subteams into invalid agent fields. | Discriminated `TeamRunMemberConfig` union. | In This Change | Update consumers to narrow by `memberKind`. |
| Agent-only `MixedTeamMemberContext` | Cannot persist child team IDs/context. | `MixedAgentMemberContext` + `MixedSubTeamMemberContext`. | In This Change | Common base includes path/route identity. |
| Flat `TeamRunMemberMetadata` as authoritative restore schema | Cannot restore topology. | Canonical recursive `TeamRunMetadata` with a `memberTree`. | In This Change | Do not introduce a version-suffixed metadata type or `runVersion`; legacy flat metadata restore fails clearly instead of guessing topology. |
| `subTeamNodeName` as the only nested event identity | Ambiguous for deep nesting. | Canonical `sourcePath` on `TeamRunEvent`. | In This Change | WebSocket/GraphQL mappers may derive legacy/display aliases from `sourcePath`; old single-name field must not remain domain source of truth. |

## Return Or Event Spine(s) (If Applicable)

- Top-level agent event: `AgentRun event -> MixedAgentMemberHandle -> MixedTeamManager.publish(event with sourcePath [memberName]) -> TeamRun subscribers/WebSocket`
- Subteam child event: `Child TeamRun event -> MixedSubTeamMemberHandle event bridge -> parent MixedTeamManager.publish(event with sourcePath [subteamName, ...childSourcePath]) -> TeamRun subscribers/WebSocket`
- Status event: `member status changes -> MixedTeamManager.deriveTeamStatus() -> TeamRunEventSourceType.TEAM status event`

## Bounded Local / Internal Spines (If Applicable)

Parent owner: `MixedTeamManager`

`Member command -> ensure handle ready -> execute handle command -> update runtime context -> derive status -> publish status if changed`

This bounded local spine is important because both agent and subteam handles must obey identical lifecycle sequencing.

Parent owner: `MixedSubTeamMemberHandle`

`Child TeamRun subscribe -> receive child event -> prefix sourcePath -> parent publish -> update child run ID/status`

This is the child-team event bridge analogous to AutoByteus-ts `TeamEventBridge`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Definition lookup | DS-001 | Topology planner | Load root/child definitions. | Planner should not know persistence internals. | Manager would perform late runtime lookups and fail after partial startup. |
| Launch config matching | DS-001 | Topology planner | Match user/preset launch settings to leaf agents by path/route key. | Keeps execution config complete before backend creation. | Runtime would discover missing model/workspace settings too late. |
| Workspace normalization | DS-001 | TeamRunService | Resolve workspace IDs/root paths for leaf agents. | Existing service already owns workspace setup. | Topology planner would mix graph planning with workspace persistence. |
| Event pipeline | DS-003 | Member handle/event bridge | Normalize agent events before parent publication. | Existing event projection expects processed events. | Raw provider events leak to parent consumers. |
| Metadata projection | DS-004 | TeamRunMetadataMapper | Recursive runtime/context <-> durable metadata. | Restore needs one owner for schema. | Runtime manager would own persistence mapping. |
| WebSocket mapping | DS-003 | AgentTeamStreamHandler | Convert `TeamRunEvent` to client messages. | Transport-specific shaping. | Mixed manager would become transport-aware. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Definition graph traversal | `agent-team-execution/services/team-definition-traversal-service.ts` | Extend/Replace | Existing service has cycle logic but returns flat leaves. | New topology planner should own recursive executable graph; old flat collector is not enough. |
| Team runtime abstraction | `TeamRun` / `TeamRunBackend` | Reuse | Child team member can be represented by an internal `TeamRun`. | N/A |
| Agent runtime abstraction | `AgentRun` / `AgentRunManager` | Reuse | Agent members remain individual runs. | N/A |
| Event processing | `publishProcessedTeamAgentEvents` and default event pipeline | Reuse/Extend | Agent event normalization already exists. | Need path attribution extension for subteam events. |
| Metadata store | `TeamRunMetadataService` / `TeamRunMetadataMapper` | Extend | Same durable storage should store recursive metadata. | N/A |
| Native nested team reference | AutoByteus-ts `TeamManager`, `TeamEventBridge`, `SubTeamShutdownStep` | Reuse as design reference | Behavior is local package, not server runtime abstraction. | Direct reuse is not possible for Codex/Claude server runs. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Team definition / topology planning | Recursive definition resolution, validation, identity derivation, launch config matching. | DS-001 | `TeamRunService` | Create New / Replace flat traversal | Put under `agent-team-execution/services`. |
| Team run domain model | Recursive/discriminated config, runtime context, events. | DS-001, DS-003, DS-004 | All team backends | Extend | Must be semantically tight. |
| Mixed backend runtime | Agent/subteam member lifecycle and routing. | DS-002, DS-003, DS-005 | `MixedTeamManager` | Extend | Main implementation work. |
| Run history metadata | Recursive metadata and restore context. | DS-004 | `TeamRunMetadataMapper` | Extend | Canonical `TeamRunMetadata` stores child runs inside parent metadata, not top-level history. |
| API/WebSocket transport | Path-aware stream payloads and target identity fields. | DS-002, DS-003 | Stream handler/resolvers | Extend | Transport remains off-spine; accepts/emits path/route selectors for nested commands and approvals. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `team-run-member-config.ts` | Team run domain | Config model | Discriminated agent/subteam member config types. | Shared by service/factories/managers. | Yes |
| `team-run-member-identity.ts` | Team run domain | Identity model | Member path/route key construction and matching. | Prevent duplicate ad hoc path code. | Yes |
| `team-definition-topology-planner.ts` | Topology planning | Planner | Build recursive executable config tree from definitions and launch config. | Owns graph-specific logic. | Yes |
| `mixed-team-member-handle.ts` | Mixed runtime | Member contract | Common command/event/status interface. | Keeps manager independent of concrete member kinds. | Yes |
| `mixed-agent-member-handle.ts` | Mixed runtime | Agent member handle | AgentRun lifecycle and command adapter. | One concrete member type. | Yes |
| `mixed-sub-team-member-handle.ts` | Mixed runtime | Subteam member handle | Child TeamRun lifecycle and command adapter. | One concrete member type. | Yes |
| `mixed-team-member-registry.ts` | Mixed runtime | Member handle registry | Resolve/cache handles by top-level name/route key/path. | Keeps lookup policy out of manager flow. | Yes |
| `mixed-sub-team-run-factory.ts` | Mixed runtime | Child run factory | Create/restore parent-owned internal child `TeamRun` from subteam config/context without registering it as a top-level active/history run. | Avoids using global top-level run manager for internal members. | Yes |
| `mixed-team-event-bridge.ts` | Mixed runtime | Event bridge | Prefix child event paths and publish to parent. | Isolates event path rewrite. | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Member path and route key derivation | `agent-team-execution/domain/team-run-member-identity.ts` | Team run domain | Used by topology, metadata, context, stream. | Yes | Yes | A generic string helper with no team semantics. |
| Discriminated member config/context narrowing | `team-run-member-config.ts`, `team-run-member-context.ts` | Team run domain | Avoid repeated `"agent_team"` checks. | Yes | Yes | A kitchen-sink config with optional agent/team fields. |
| Recursive metadata flattening for projections | `team-run-metadata-flattener.ts` | Run history metadata | Existing projections need leaf/member views. | Yes | Yes | Compatibility wrapper preserving old schema as authoritative. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentTeamMemberRunConfig` | Yes | Yes | Low | Contains only agent run fields. |
| `SubTeamMemberRunConfig` | Yes | Yes | Low | Contains child team definition/run fields and recursive members only. |
| `memberPath` + `memberRouteKey` | Yes | Yes | Medium | Define route key as derived from path and never maintain two unrelated values. |
| `TeamRunMetadata` | Yes | Yes | Medium | Use one discriminated recursive metadata schema; keep flattened projections as derived views and avoid version suffixes/fields. |
| `TeamRunEvent.sourcePath` | Yes | Yes | Low | Single canonical domain source identity; all display/route aliases derive from it. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run-member-identity.ts` | Team run domain | Member identity | Build/normalize member path and route key; match target selectors. | Identity is used across runtime and persistence. | N/A |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run-config.ts` | Team run domain | Run config | Replace flat member config with discriminated recursive union; keep `TeamRunConfig`. | Existing owning file for config. | `team-run-member-identity.ts` |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run-context.ts` | Team run domain | Runtime context | Add discriminated member handle contexts and helper traversal. | Existing owning file for runtime context. | Config/identity types |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run-event.ts` | Team run domain | Team event contract | Add path-based source identity and member-kind-aware payloads. | Existing event owner. | Identity types |
| `autobyteus-server-ts/src/agent-team-execution/services/team-definition-topology-planner.ts` | Topology planning | Planner | Recursive definition -> executable run config tree. | New owner for topology planning. | Identity/config types |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-runtime-context-support.ts` | Runtime support | Restore/backend-kind support | Use recursive topology for backend kind and restore context. | Existing support file. | Config/context types |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` | Team run service | Use-case owner | Call planner, choose mixed for nested, persist metadata. | Existing orchestration owner. | Planner/config types |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-metadata-mapper.ts` | Run history metadata | Metadata mapper | Build/read canonical recursive `TeamRunMetadata`. | Existing metadata owner. | Context/config types |
| `autobyteus-server-ts/src/run-history/store/team-run-metadata-types.ts` | Run history metadata | Durable schema | Discriminated recursive member metadata. | Existing schema file. | Identity types |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-run-context.ts` | Mixed runtime | Mixed context | Mixed agent/subteam runtime contexts. | Existing mixed context owner. | Domain context types |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-member-handle.ts` | Mixed runtime | Member contract | Common handle interface. | Keeps manager clean. | Domain types |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-agent-member-handle.ts` | Mixed runtime | Agent handle | AgentRun adapter. | One concrete member owner. | Member contract |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-sub-team-member-handle.ts` | Mixed runtime | Subteam handle | Child TeamRun adapter. | One concrete member owner. | Member contract |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-member-registry.ts` | Mixed runtime | Registry | Live handle lookup/cache. | Lookup policy separated from manager. | Identity types |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-sub-team-run-factory.ts` | Mixed runtime | Child factory | Parent-owned internal child `TeamRun` creation/restore without top-level `AgentTeamRunManager` registration/history indexing. | Prevents global manager bypass/confusion. | Config/context types |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-event-bridge.ts` | Mixed runtime | Event bridge | Child event path prefixing. | One event rewrite concern. | Event identity types |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts` | Mixed runtime | Governing owner | Orchestrate member registry, routing, status, lifecycle. | Remains main mixed manager. | Member contract |


## Final File Responsibility Mapping Addendum From Architecture Rework

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This File Must Change |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts` | Team run domain | Public team-run command facade | Accept/resolve `TeamMemberSelector` for `postMessage` and `approveToolInvocation`; default coordinator resolution returns selector. | Prevent raw string targeting from remaining the public domain command shape. |
| `autobyteus-server-ts/src/agent-team-execution/backends/team-run-backend.ts` | Team run backend contract | Backend command interface | Change command signatures from raw member strings to `TeamMemberSelector`. | Keeps all backend implementations behind one selector-aware contract. |
| `autobyteus-server-ts/src/agent-team-execution/backends/team-manager.ts` | Team run backend contract | Manager command interface | Change manager command signatures to `TeamMemberSelector`; flat managers reject unsupported nested selectors. | Prevents mixed-only selector handling from being bypassed by older manager interface. |
| `autobyteus-server-ts/src/run-history/store/team-run-metadata-store.ts` | Run history metadata | Persistence schema boundary | Validate/write canonical recursive `memberTree`; remove `runVersion`/flat `memberMetadata`; throw explicit unsupported legacy-metadata/topology-lost for old flat payloads. | Store is the JSON schema gate, not only the mapper. |
| `autobyteus-server-ts/src/run-history/services/team-run-metadata-flattener.ts` | Run history metadata projections | Derived metadata view owner | Flatten canonical `memberTree` into leaf-agent and top-level member views for projection consumers. | Avoids every consumer rediscovering recursive traversal and prevents old flat schema from remaining authoritative. |
| `autobyteus-server-ts/src/run-history/services/team-run-history-index-service.ts` | Run history projection | History index projection consumer | Use flattener-derived workspace/member summaries instead of `metadata.memberMetadata`. | Current code reads flat metadata directly. |
| `autobyteus-server-ts/src/run-history/services/team-run-history-service.ts` | Run history projection | Resume/history DTO consumer | Use flattener-derived views for resume config and summaries; expose tree where needed. | Current code reads flat metadata directly. |
| `autobyteus-server-ts/src/run-history/services/team-member-run-view-projection-service.ts` | Run history projection | Leaf member projection consumer | Resolve only agent leaf metadata from the flattener by route key/path. Reject subteam route keys when an agent projection is requested. | Current code assumes every metadata member is an agent. |
| `autobyteus-server-ts/src/run-history/services/run-file-change-projection-service.ts` | Run history projection | File-change projection consumer | Resolve leaf agent members through flattener-derived agent metadata. | Current code searches flat `memberMetadata`. |
| `autobyteus-server-ts/src/agent-team-execution/domain/member-team-context.ts` | Team communication domain | Member descriptor contract | Replace agent-only descriptor with discriminated agent/subteam descriptors carrying member path/route and member kind. | Parent agents must see subteam members as addressable recipients. |
| `autobyteus-server-ts/src/agent-team-execution/services/member-team-context-builder.ts` | Team communication domain | Descriptor builder | Build member-kind-aware descriptors and allowed recipient selectors, not only allowed recipient names. | Subteam recipients have no runtimeKind and must not be hidden. |
| `autobyteus-server-ts/src/agent-team-execution/domain/inter-agent-message-delivery.ts` | Team communication domain | Delivery command DTO | Add recipient/sender selector, route key, and path fields. Keep names display-only. | Enables path-safe parent-to-subteam delivery. |
| `autobyteus-server-ts/src/agent-team-execution/services/inter-agent-message-router.ts` | Team communication runtime | Agent recipient adapter | Accept resolved agent member delivery only; subteam delivery is owned by `MixedSubTeamMemberHandle`. | Avoids routing subteam messages through an agent-only router. |
| `autobyteus-server-ts/src/agent-team-execution/services/inter-agent-message-runtime-builders.ts` | Team communication runtime | Message/event builders | Build member-kind-aware communication events and recipient-visible messages with path/route identity. | Current payload names are agent-only. |
| `autobyteus-server-ts/src/services/team-communication/team-communication-types.ts` | Team communication projection | Projection schema | Store sender/receiver participants with member kind, path, route key, run IDs, and optional team definition ID. | Projection must represent subteam receivers without pretending they are agents. |
| `autobyteus-server-ts/src/services/team-communication/team-communication-normalizer.ts` | Team communication projection | Projection normalizer | Normalize member-kind-aware communication payloads from team events. | Current normalizer consumes agent-shaped sender/receiver fields. |
| `autobyteus-server-ts/src/services/team-communication/team-communication-service.ts` | Team communication projection | Projection event consumer | Consume canonical team communication events, not only `TeamRunEventSourceType.AGENT` with `TEAM_COMMUNICATION_MESSAGE`. | AC-003 depends on parent-level subteam-recipient projection. |

## Ownership Boundaries

- `TeamRunService` is the authoritative top-level create/restore service. It may call topology planning and metadata mapping; callers must not directly build mixed contexts.
- `TeamDefinitionTopologyPlanner` is the authoritative definition graph interpreter for execution. Backends must not independently flatten or reinterpret team definitions.
- `MixedTeamManager` is the authoritative runtime owner for one mixed team run. Callers above it use `MixedTeamRunBackend`/`TeamRun`; they must not directly access member handles or child team runs.
- `MixedTeamMemberHandle` implementations encapsulate concrete provider/lifecycle differences. `MixedTeamManager` calls the common interface and does not special-case `AgentRun` versus `TeamRun` except at construction/registry boundaries.
- `TeamRunMetadataStore` is the authoritative durable metadata JSON schema boundary. It validates only canonical recursive `TeamRunMetadata.memberTree`, rejects historical flat metadata explicitly, and does not return silent `null` for old-schema payloads.
- `TeamRunMetadataMapper` maps runtime config/context to canonical recursive metadata and restore context. It does not own raw JSON schema validation and must not compatibility-read flat metadata.
- `team-run-metadata-flattener.ts` is the authoritative derived-view owner for flat leaf-agent/top-level member projections over canonical `memberTree`. Projection consumers must not read historical `memberMetadata` or duplicate recursive traversal.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TeamRunService` | Topology planner, metadata mapper, backend manager. | GraphQL, application launch, external channel launch. | Callers build `TeamRunConfig` trees directly from definitions. | Add explicit service method/input. |
| `TeamDefinitionTopologyPlanner` | Recursive traversal, cycle checks, route identity. | `TeamRunService`, metadata restore helpers. | Mixed factory re-loads definitions and computes routes itself. | Add planner output field. |
| `MixedTeamManager` | Member handle registry, member handles, event subscriptions. | `MixedTeamRunBackend`, child member handles. | Backend or transport directly calls `AgentRunManager` for mixed members. | Add manager command. |
| `MixedTeamMemberHandle` | Concrete AgentRun/TeamRun command mapping. | `MixedTeamManager`. | Manager stores `AgentRun` and `TeamRun` in parallel maps and switches everywhere. | Extend handle interface. |
| `TeamRunMetadataStore` | Canonical recursive metadata validation/read/write. | `TeamRunService`, run-history services. | Store accepts `runVersion`/flat `memberMetadata`, silently returns `null`, or migrates old schema. | Strengthen store schema validation and explicit unsupported-legacy errors. |
| `TeamRunMetadataMapper` | Runtime config/context <-> canonical metadata conversion. | `TeamRunService`. | Mapper reads raw JSON files, validates old schemas, or guesses topology from definitions. | Add mapper helper over canonical `TeamRunMetadata`. |
| `team-run-metadata-flattener.ts` | Derived flat views from `memberTree`. | Run-history/member/file-change projections. | Projections read `metadata.memberMetadata` or each duplicate recursive traversal. | Add flattener helper for the needed derived view. |

## Dependency Rules

Allowed:

- `TeamRunService -> TeamDefinitionTopologyPlanner -> AgentTeamDefinitionService`
- `TeamRunService -> AgentTeamRunManager -> MixedTeamRunBackendFactory`
- `MixedTeamRunBackend -> MixedTeamManager`
- `MixedTeamManager -> MixedTeamMemberRegistry -> MixedTeamMemberHandle`
- `MixedAgentMemberHandle -> AgentRunManager`
- `MixedSubTeamMemberHandle -> MixedSubTeamRunFactory -> MixedTeamRunBackendFactory` for internal child runs
- `TeamRunMetadataStore -> TeamRunMetadata` canonical schema validation
- `TeamRunMetadataMapper -> TeamRunConfig/Context domain types`
- `Run-history projection consumers -> team-run-metadata-flattener.ts -> TeamRunMetadata.memberTree`

Forbidden:

- Transport/resolvers directly constructing `MixedTeamMemberContext` or child `TeamRun`s.
- `MixedTeamManager` directly managing separate `Map<string, AgentRun>` and `Map<string, TeamRun>` as public policy; use member handles.
- Runtime event consumers guessing nested identity from member names; use `sourcePath`/route key.
- Metadata store or mapper keeps old flat restore support, migration branches, dual schemas, silent `null` fallback, or recovery for historical team metadata.
- Run-history projection consumers read `metadata.memberMetadata` directly; use flattener-derived views over `memberTree`.
- Child team members bypassing the subteam boundary to directly send to arbitrary parent leaf agents in this change.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `TeamDefinitionTopologyPlanner.buildPlan(input)` | Team definition topology | Build recursive executable topology. | `teamDefinitionId + launch configs keyed by memberRouteKey/memberPath` | Reject ambiguous names. |
| `TeamRun.postMessage(message, selector)` | Public team command | Route user message through the backend command chain. | `TeamMemberSelector`; edge strings already normalized. | Default target resolves to coordinator selector. |
| `TeamRunBackend.postMessage(message, selector)` | Backend command interface | Carry selector to concrete backend. | `TeamMemberSelector`. | No raw string target in backend contract. |
| `TeamManager.postMessage(message, selector)` | Manager command interface | Manager-level routing. | `TeamMemberSelector`. | Flat managers reject nested path selectors. |
| `TeamMemberSelector` (`team-run-member-identity.ts`) | Team run identity | Canonical command target shape. | `{ memberPath }` or `{ memberRouteKey }`; `{ memberName }` only for top-level/unambiguous boundary lookup. | Avoids overloading raw strings for nested leaf operations. |
| `MixedTeamManager.postMessage(message, selector)` | Mixed team runtime | Route user message to top-level agent or subteam. | `TeamMemberSelector` only; edge adapters convert strings before this method is called. | Subteam target defaults to child coordinator. |
| `MixedTeamManager.deliverInterAgentMessage(request)` | Mixed team runtime | Route parent-level member communication. | Recipient selector resolved in the current team boundary. | Child-internal communication stays in child manager; parent sees subteam as one member. |
| `MixedTeamMemberHandle.postMessage(message)` | Member handle | Post user-visible work to agent or team. | No external selector; handle already resolved. | Subteam handle calls child `TeamRun.postMessage(message, null)`. |
| `MixedTeamMemberHandle.deliverInterMemberMessage(request)` | Member handle | Deliver teammate message to resolved recipient. | Request + resolved parent sender `sourcePath`. | Agent and subteam map differently. |
| `TeamRunMetadataStore.readMetadata/writeMetadata` | Metadata persistence schema | Persist and validate only canonical recursive metadata. | `TeamRunMetadata.memberTree`; no `runVersion`, no flat `memberMetadata`. | Unsupported historical flat metadata raises explicit unsupported-legacy/topology-lost instead of null/migration/fallback. |
| `TeamRunMetadataMapper.buildRestoreContext(metadata)` | Metadata restore | Rebuild recursive context. | `teamRunId` + recursive `memberTree` shape. | No version field; legacy flat metadata is rejected and never inflated into nested topology. |
| `TeamCommunicationService` canonical communication projection | Team communication projection | Store parent-level member communication including subteam recipients. | Sender/receiver participant kind/path/route/run IDs. | Does not project an `agent_team` recipient as an agent runtime. |
| `approveToolInvocation(selector, invocationId, ...)` | Agent member tool approval | Approve leaf agent tool invocation. | Leaf agent selector derived from approval event `sourcePath`/route key. | Reject top-level subteam target or ambiguous bare leaf name. |
| WebSocket `SEND_MESSAGE` / GraphQL run commands | Transport commands | Adapt client payloads to `TeamMemberSelector`. | Prefer `target_member_path` or `target_member_route_key`; legacy `target_member_name` is top-level/unambiguous only. | Transport remains a mapper, not routing owner. |
| WebSocket/GraphQL tool approval | Transport commands | Approve exact nested leaf. | Prefer `source_path`/`member_route_key` from approval-request event; any legacy `agent_id` input is transport-edge input only and must resolve uniquely into `TeamMemberSelector` before the domain call. | Prevents duplicate-name leaf ambiguity. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TeamDefinitionTopologyPlanner.buildPlan` | Yes | Yes | Low | Require path/route-key matching. |
| `MixedTeamManager.postMessage` | Yes | Yes | Low | Accept `TeamMemberSelector` only; raw strings are normalized by transport/domain edge adapters before reaching the mixed manager. |
| `MixedTeamManager.deliverInterAgentMessage` | Yes | Yes | Low | Resolve recipient selector inside the current team boundary; parent-to-subteam targets the subteam member, not child leaves. |
| `approveToolInvocation` | Yes | Yes | Low | Approval request events expose `sourcePath`; approval command uses path/route selector and rejects ambiguity. |
| WebSocket/GraphQL command mappers | Yes | Yes | Low | Map `target_member_path`/`target_member_route_key`/approval `source_path` to domain selectors; derive legacy aliases only at edge. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Recursive graph planner | `TeamDefinitionTopologyPlanner` | Yes | Low | Avoid “helper/traversal” if it owns executable plan. |
| Member handle | `MixedTeamMemberHandle` | Yes | Low | Do not call it “node helper.” |
| Agent concrete handle | `MixedAgentMemberHandle` | Yes | Low | N/A |
| Subteam concrete handle | `MixedSubTeamMemberHandle` | Yes | Low | N/A |
| Event path field | `sourcePath` | Yes | Low | Canonical source identity for all runtime-sourced team events. |

## Applied Patterns (If Any)

- Strategy/Adapter: `MixedTeamMemberHandle` is a small polymorphic adapter around `AgentRun` or child `TeamRun` commands.
- Registry: `MixedTeamMemberRegistry` caches and resolves member handles by route key/path.
- Factory: `MixedSubTeamRunFactory` creates/restores internal child team runs.
- Event bridge: `MixedTeamEventBridge` prefixes child event source paths and republishes to parent listeners.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run-member-identity.ts` | File | Team run domain | Path/route-key identity. | Cross-cutting team-run domain concept. | Runtime creation or persistence. |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run-config.ts` | File | Team run domain | Recursive config union. | Existing config owner. | Definition lookup. |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run-context.ts` | File | Team run domain | Recursive runtime context union. | Existing context owner. | Backend-specific construction. |
| `autobyteus-server-ts/src/agent-team-execution/services/team-definition-topology-planner.ts` | File | Topology planner | Definition graph to config tree. | Service-level planning before backend. | Runtime command routing. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/` | Folder | Mixed runtime | Mixed backend files. | Existing mixed backend folder. | GraphQL transport. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/` | Folder | Mixed member-handle module | Member handle contract and concrete handles. | Mixed folder benefits from structural depth. | Topology definition loading. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/events/` | Folder | Mixed event bridge module | Child event bridge/path rewriting. | Keeps event bridge separate from lifecycle. | Provider event parsing unrelated to team events. |
| `autobyteus-server-ts/src/run-history/store/team-run-metadata-types.ts` | File | Durable metadata schema | Canonical recursive `TeamRunMetadata`. | Existing schema owner. | Mapper logic. |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-metadata-mapper.ts` | File | Metadata mapper | Recursive metadata/context conversion. | Existing mapper owner. | Member handle command logic or raw JSON schema validation. |
| `autobyteus-server-ts/src/run-history/store/team-run-metadata-store.ts` | File | Metadata persistence boundary | Validate/read/write canonical `memberTree`; reject `runVersion`/flat `memberMetadata` explicitly. | Store owns persisted JSON shape. | Migration, fallback, topology guessing, or silent invalid-metadata nulling for old schema. |
| `autobyteus-server-ts/src/run-history/services/team-run-metadata-flattener.ts` | File | Metadata derived projections | Produce leaf-agent and top-level member views from canonical `memberTree`. | Keeps projection consumers off the canonical schema internals. | Compatibility reading historical flat metadata. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-team-execution/domain` | Main-Line Domain-Control | Yes | Low | Holds cross-backend team run contracts. |
| `agent-team-execution/services` | Main-Line Domain-Control / Off-Spine planning | Yes | Medium | Planner and metadata mapper are service concerns but distinct owners. |
| `agent-team-execution/backends/mixed/members` | Main-Line Domain-Control | Yes | Low | Structural depth needed because member handles become the key mixed runtime abstraction. |
| `agent-team-execution/backends/mixed/events` | Off-Spine Concern | Yes | Low | Event bridge serves manager; not on command spine. |
| `run-history/store` | Persistence-Provider | Yes | Low | Durable schema only. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Nested route identity | `['EngineeringDept', 'CodeReviewTeam', 'Reviewer'] -> 'EngineeringDept/CodeReviewTeam/Reviewer'` | Bare `Reviewer` as global identity. | Multiple departments may have a `Reviewer`. |
| Member-handle boundary | `MixedTeamManager -> MixedTeamMemberHandle.postMessage()` | `if (member.refType === 'agent_team') { ... } else { agentRun... }` repeated in every command. | Keeps lifecycle/routing centralized. |
| Posting to subteam | Parent `send_message_to('CodeReviewTeam')` -> subteam `TeamRun.postMessage(message, null)` -> child coordinator. | Parent resolves `CodeReviewTeam` to child leaf `Reviewer` and posts directly. | Preserves department/team boundary. |
| Event attribution | `sourcePath: ['CodeReviewTeam', 'Reviewer']`, with transport deriving `source_route_key: 'CodeReviewTeam/Reviewer'` if needed. | `subTeamNodeName: 'Reviewer'` as authoritative identity or no path. | Distinguishes subteam path from leaf member identity. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Continue flattening nested teams into leaf agents for mixed runs | Existing services/tests already do this. | Rejected | Use recursive topology and subteam member handles. |
| Add optional subteam fields onto agent `TeamMemberRunConfig` | Minimizes compile changes. | Rejected | Use discriminated union so agent/team fields do not overlap. |
| Keep `subTeamNodeName` as authoritative nested identity | Existing AutoByteus backend uses it. | Rejected as authoritative | Replace with path-based source identity; derive any one-name display only at transport edge if absolutely necessary. |
| Use global `AgentTeamRunManager` as the child subteam registry | Easy reuse. | Rejected for internal members | Use mixed-owned child factory/handles; parent owns internal child lifecycle and metadata. |
| Restore, migrate, or recover old flat team metadata | Avoids breaking historical data. | Rejected | Use canonical recursive `TeamRunMetadata`; unsupported historical flat metadata fails fast. Do not add migration/fallback/dual-schema/topology-guessing code. |

## Derived Layering (If Useful)

- Transport layer: GraphQL/WebSocket/external channel call `TeamRunService` or consume `TeamRunEvent`.
- Team run orchestration layer: `TeamRunService`, topology planner, metadata mapper.
- Runtime layer: `AgentTeamRunManager`, `MixedTeamRunBackend`, `MixedTeamManager`, member handles.
- Provider/runtime adapter layer: existing `AgentRunManager` and provider backends for leaf agents.

Layering is explanatory only; ownership boundaries above are authoritative.

## Migration / Refactor Sequence

1. Add domain identity/config/context/event types for recursive members, source path, and `TeamMemberSelector`.
2. Update public command signatures across `TeamRun`, `TeamRunBackend`, and `TeamManager` to accept `TeamMemberSelector`; add adapter helpers for transport string payloads.
3. Add `TeamDefinitionTopologyPlanner` and tests for nested tree planning, route paths, duplicate names, missing refs, cycle rejection, and coordinator-agent invariant.
4. Update `TeamRunService` to use topology planning for create-run and to select `TeamBackendKind.MIXED` when topology contains subteams.
5. Update mixed run context/factory to create recursive mixed contexts and pass them to `MixedTeamManager`.
6. Add mixed member handle contract, agent handle, subteam handle, registry, child run factory, and event bridge.
7. Refactor `MixedTeamManager` to depend on member handles and remove direct `AgentRun` maps/agent-only command paths.
8. Update member-team context, inter-agent delivery DTOs/builders, and team communication projection/service to use member-kind-aware descriptors, selector/path identities, and subteam-recipient communication events.
9. Update metadata types/store/mapper to canonical recursive `TeamRunMetadata` with no version suffix/field, delete/replace old flat metadata restore code, reject unsupported historical metadata immediately, and update flattener-based projection consumers to use canonical `sourcePath` with derived transport aliases.
10. Update tests that currently assert nested definitions flatten for Codex/Claude to either target non-nested flat behavior or to assert nested definitions route through mixed.
11. Run focused unit/integration tests; then run live provider E2E only after environment setup is complete.

## Key Tradeoffs

- Recursive metadata is a larger change than storing child runs globally, but it keeps nested teams owned by the parent run and avoids top-level active/history clutter.
- Choosing mixed for any nested definition may route same-runtime nested teams away from existing Codex/Claude team managers, but that matches the product direction that mixed is the superset manager.
- Path-based identity is stricter than bare names, but it is required for organization-like structures where departments repeat role names.
- Deferring direct cross-level child-to-parent messaging keeps the team boundary clean and mirrors AutoByteus-ts subteam behavior.

## Risks

- Many current consumers assume flat `memberConfigs` and flat `memberMetadata`; implementation must update all type errors rather than patching with casts.
- Existing run history restore for old flat metadata should fail clearly with an unsupported legacy-metadata/topology-lost error; do not infer nested topology and do not add migration, fallback, dual-schema, or compatibility branches.
- Stream clients need updates to consume canonical `sourcePath` or derived route aliases instead of a single subteam name.
- Tool-approval clients must round-trip nested source path/route identity from approval-request event to approval command.
- Validation cannot be fully trusted until dependencies are installed in the dedicated worktree and focused tests run.

## Guidance For Implementation

- Start with domain types and topology planner tests before touching `MixedTeamManager`.
- Do not implement nested support by adding subteam conditionals directly to every current `AgentRun` operation.
- Treat `memberRouteKey` as derived from `memberPath`; avoid independent parallel identities.
- Treat `sourcePath` as the canonical event identity; derive `source_route_key`, `agent_name`, and any legacy `sub_team_node_name` only in transport/projection code.
- Keep child team creation internal to mixed member handles unless product explicitly wants child runs to become top-level active/history runs.
- Use AutoByteus-ts `TeamManager`, `TeamEventBridge`, and `SubTeamShutdownStep` as behavior references, but implement against server `AgentRun`/`TeamRun` abstractions.
- Add tests around the actual user story: parent team has a `CodeReviewTeam` member; parent agent sends work to that member; child team coordinator receives it; child leaf events appear under `sourcePath: ['CodeReviewTeam', '<leaf>']`.
