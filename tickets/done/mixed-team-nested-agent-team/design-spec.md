# Design Spec

## Current-State Read

The backend can store nested agent-team definitions but the mixed execution path is still flat. `AgentTeamDefinition.nodes` allows `refType: "agent_team"`, and GraphQL exposes that shape. However team-run launch currently expands nested definitions into leaf agent configs through `TeamDefinitionTraversalService.collectLeafAgentMembers()`. `TeamRunConfig.memberConfigs`, `MixedTeamMemberContext`, `TeamRunMemberMetadata`, and `MixedTeamManager` all assume every executable team member is an agent run.

The mixed runtime spine today is:

`TeamRunService -> AgentTeamRunManager -> MixedTeamRunBackendFactory -> MixedTeamRunBackend -> MixedTeamManager -> AgentRunManager -> AgentRun`

That path cannot make a top-level member be another team. The only nested runtime implementation in the repository is AutoByteus-native: AutoByteus-ts has `ManagedNode = Agent | AgentTeam`, lazy subteam creation, event bridging, and subteam shutdown; the server AutoByteus backend hydrates nested `AgentTeamConfig`s and converts native `SUB_TEAM` events. The mixed backend needs the same ownership shape using server `AgentRun | TeamRun` abstractions. Full-stack validation on 2026-05-13 added a frontend current-state finding: backend recursive `memberTree` can now exist for a real run, but `autobyteus-web` still builds active workspace/team UI from flattened leaf-agent helpers and omits subteam rows such as `BuildSquad`.

## Intended Change

Make the mixed team manager the authoritative nested-team execution path by introducing recursive mixed-team topology, discriminated member config/context/metadata, and a mixed runtime-member boundary. A mixed team member can be either:

- an `agent` member handle backed by `AgentRun`, or
- an `agent_team` member handle backed by an internal child `TeamRun`.

New runs whose definitions contain nested `agent_team` nodes should route to `TeamBackendKind.MIXED`, even when every leaf agent uses the same runtime kind. This is a deliberate semantics change for new nested launches: the old flatten-to-leaves behavior is not preserved as an execution mode for nested definitions. Single-runtime team managers remain in the codebase for non-nested teams but do not own the new nested execution behavior.

The frontend must also treat nested teams as first-class team members. The visible workspace tree, active team member panel, grid/spotlight/focus modes, launch configuration, run history/restore, streaming, and activity/communication read models must preserve subteam nodes and use canonical route/path identity rather than flattening nested leaves into parent-level agent rows.

Nested communication is not allowed to remain top-down only, and normal `send_message_to` visibility should not expose abstract subteam node names as if they were agents. Parent-to-subteam delegation exposes the subteam coordinator/representative as the visible recipient while routing through the structural subteam boundary. A child coordinator also has a controlled upward reporting path to immediate parent-boundary recipients such as the parent delegator. This is a bounded communication roster, not arbitrary cross-level messaging: child members do not become top-level parent members and cannot message unrelated grandparents, sibling internals, or global runs. The LLM-facing roster must be rendered as a named team membership manifest so the agent sees which real teams it belongs to, its role in each team, and the exact `recipient_name` values it may use; implementation scope labels remain internal. Command API clean-cut decision: team member command targets and tool approvals accept structured path/route selector fields only; scalar command target aliases are rejected at transport/GraphQL edges rather than retained as compatibility inputs.

The 2026-05-17 Electron upgrade finding adds a data-migration requirement for historical flat team-run metadata. This is not a reversal of the clean runtime schema policy: normal runtime/read/restore code still accepts only canonical recursive `TeamRunMetadata.memberTree`. Known old `runVersion` + flat `memberMetadata[]` files are converted by a registered app data migration before normal history hydration, with durable database status and a Settings -> Server -> Migrations UI. If migration fails, the normal app UI must remain usable and raw parser errors must stay out of the sidebar/workspace.

The 2026-05-17 delivery/user status finding adds an integration requirement for the already-merged `agent-initializing-status-ux` behavior from `origin/personal`, with corrected ownership: backend runtime lifecycle is the sole authority for canonical statuses. Accepted user sends/startups must show backend-emitted/snapshotted `offline -> initializing -> running` for individual agents and team/nested members. The nested branch may keep public statuses canonical, but provider-edge lifecycle translation must stay in the backend and frontend must stop authoring canonical `currentStatus = initializing`; frontend may only own local pending-submit UI.

## Design-Owner Recheck Decisions

Architecture review paused for design-owner confirmation. The refined decisions are:

1. **Nested backend selection:** any newly launched definition containing `agent_team` nodes routes to `TeamBackendKind.MIXED`. The previous flattening behavior remains only a description of current/legacy behavior, not a compatibility mode for new nested launches.
2. **Child run ownership:** child team member handles are parent-owned internal `TeamRun` instances created by `MixedSubTeamRunFactory`; they are not registered as top-level active/history runs through `AgentTeamRunManager`. A team definition launched directly by the user still creates a normal top-level run.
3. **Metadata schema policy:** use one canonical recursive `TeamRunMetadata` schema. Do not introduce a version-suffixed metadata type and do not keep a `runVersion` field. Normal restore must never guess legacy flat metadata into nested topology. Known historical flat metadata is handled only by an isolated app data migration that rewrites it to canonical `memberTree`; after migration, runtime readers remain current-schema-only.
4. **Event identity:** `TeamRunEvent.sourcePath` is the single canonical runtime-source identity. `memberRouteKey`, `source_route_key`, `sub_team_node_name`, display names, and other aliases are derived from `sourcePath` only at transport/projection edges.
5. **Command/tool approval identity:** GraphQL, WebSocket, and tool-approval command paths must use path/route `TeamMemberSelector` identity only (`memberPath` or `memberRouteKey`). Bare `memberName`, command-side `agent_name`, command-side `agent_id`, top-level-name selectors, and scalar transport strings are invalid command targets. Tool approval request events must include `sourcePath`/route identity so approval can target the exact nested leaf.
6. **Naming:** Use `TeamMemberNode` / `TeamMemberTreeNode` for frontend or definition tree data. Use `MixedTeamMemberHandle` for backend live command/lifecycle adapters. Avoid `TeamRuntimeNode`; `runtime` stays only where it describes actual runtime state, such as `TeamRunContext` or `runtimeKind`.


## Architecture Review Round 7 Rework Decisions

The independent architecture review found three design-impact gaps. The following decisions are authoritative implementation guidance and supersede any looser wording elsewhere in this document.

### ARCH-NESTED-001 Resolution: Selector Is The Public Command Boundary

`TeamMemberSelector` is not only a mixed-manager helper. It is the authoritative command target identity across the domain/backend command chain.

Target command shape:

```ts
type TeamMemberSelector =
  | { kind: 'path'; memberPath: string[] }
  | { kind: 'route_key'; memberRouteKey: string };
```

Rules:

- `memberPath` and `memberRouteKey` are canonical for all team command targets.
- Public WebSocket/GraphQL command payloads must provide explicit path/route fields; scalar name/id target aliases are rejected at the edge.
- `send_message_to.recipient_name` remains a model-tool roster argument, not a command selector; tool handlers resolve it through `communicationRecipients` descriptors before building a path/route `TeamMemberSelector`.
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
- If a stored payload has old flat markers such as `memberMetadata` or `runVersion`, normal runtime readers throw/report a typed legacy-unmigrated diagnostic. They must not silently return `null`, migrate in place, fallback-read, dual-read, or infer topology. Conversion of known legacy flat metadata belongs only to the app data migration subsystem before normal history/restore hydration.
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

### ARCH-NESTED-003 / ARCH-COMM-001+002 Resolution: Team Communication Uses Absolute-Route Representative Delivery

Round 10 tightened the earlier member-kind/path-aware communication design. The canonical contract is now **absolute-route representative delivery**:

- `InterAgentMessageDeliveryRequest.teamRunId` is the communication coordinate root and projection owner for that delivery.
- Every delivery participant path/route in the request is relative to that `teamRunId`.
- Parent-to-subteam representative delivery targets the actual representative leaf route under the parent root, for example `BuildSquad/review_lead`; it does **not** collapse to abstract `BuildSquad` default/coordinator delivery once the representative is known.
- `MixedTeamManager` may resolve the executable handle by the top-level segment (`BuildSquad`) when the target is nested, but communication identity and recipient input trace remain the actual representative leaf (`BuildSquad/review_lead`).
- `MixedSubTeamMemberHandle` is responsible for translating a root-relative nested target under its subteam path into a child-local selector before posting into the child run.

This replaces the rejected default-only inter-member delivery contract. Structural user/composer commands addressed to the subteam node itself may still let the child team choose its configured default target; representative `send_message_to` delivery MUST carry the explicit nested representative selector.

Canonical coordinate and participant shapes:

```ts
type TeamMemberAddress = {
  /** The team run whose topology defines memberPath/memberRouteKey. */
  teamRunId: string;
  /** Path relative to teamRunId, e.g. ['program_manager'] or ['BuildSquad', 'review_lead']. */
  memberPath: string[];
  /** Normalized route relative to teamRunId, e.g. 'program_manager' or 'BuildSquad/review_lead'. */
  memberRouteKey: string;
};

type TeamCommunicationRepresentedSubTeam = {
  address: TeamMemberAddress;          // same coordinate root as the participant
  memberName: string;                  // e.g. 'BuildSquad'
  memberRunId: string;
  teamDefinitionId: string;
  childTeamRunId?: string | null;
};

type TeamCommunicationParticipant = {
  memberKind: 'agent' | 'agent_team';
  memberName: string;
  memberRunId: string;
  memberPath: string[];                // relative to payload.teamRunId
  memberRouteKey: string;              // relative to payload.teamRunId
  platformRunId?: string | null;
  teamDefinitionId?: string | null;
  representedSubTeam?: TeamCommunicationRepresentedSubTeam | null;
};

type InterAgentDeliveryParticipant = TeamCommunicationParticipant & {
  address: TeamMemberAddress;          // address.teamRunId === request.teamRunId
  selector?: TeamMemberSelector | null; // selector relative to request.teamRunId when this participant must be resolved
};

interface InterAgentMessageDeliveryRequest {
  /** Coordinate root/projection owner. All participant paths/selectors are relative to this run. */
  teamRunId: string;
  sender: InterAgentDeliveryParticipant;
  recipient: InterAgentDeliveryParticipant & { selector: TeamMemberSelector };
  content: string;
  messageType?: string | null;
  referenceFiles?: string[] | null;
  parentCommunicationMessageId?: string | null;
  recipientInputMessageId?: string | null;
  recipientInputDedupeKey?: string | null;
}
```

Descriptor shape uses the same coordinates instead of parallel loose fields:

```ts
type CommunicationRecipientScope =
  | 'local_agent'
  | 'local_subteam_representative'
  | 'parent_boundary_agent'
  | 'parent_boundary_subteam_representative';

type MemberTeamRecipientDescriptor = {
  recipientName: string;        // accepted tool argument, unique within this member's roster
  displayName: string;
  recipientScope: CommunicationRecipientScope;
  delivery: {
    teamRunId: string;          // coordinate root / manager entry target
    selector: TeamMemberSelector; // relative to delivery.teamRunId; generated descriptors prefer route_key
  };
  participant: TeamCommunicationParticipant & { address: TeamMemberAddress };
};
```

Descriptor invariants:

- `descriptor.delivery.teamRunId === descriptor.participant.address.teamRunId`.
- `descriptor.participant.address.memberRouteKey === descriptor.participant.memberRouteKey`.
- `descriptor.participant.address.memberPath` equals `descriptor.participant.memberPath`.
- Generated descriptors should use `route_key` selectors so descriptor resolution never depends on visible-name command targeting.
- If `participant.representedSubTeam` is present, its address uses the same `teamRunId` and its path is an ancestor/prefix of the representative participant path.
- No reply alias, `reply_to_sender`, `replyAddress`, or stored reply-context field exists in this descriptor.

Coordinate examples:

| Current member context | Visible `recipient_name` | `descriptor.delivery.teamRunId` | `descriptor.delivery.selector` | Recipient participant address | `representedSubTeam` |
| --- | --- | --- | --- | --- | --- |
| Parent member `program_manager` in parent run | `review_lead` | parent run ID | `route_key('BuildSquad/review_lead')` | parent run + `BuildSquad/review_lead` | `BuildSquad` |
| Child member `BuildSquad/review_lead` messaging child teammate | `qa_specialist` | child run ID | `route_key('qa_specialist')` | child run + `qa_specialist` | none |
| Child member `BuildSquad/review_lead` reporting upward | `program_manager` | parent run ID | `route_key('program_manager')` | parent run + `program_manager` | none on recipient; sender participant carries `representedSubTeam=BuildSquad` |

A child-local descriptor never mixes child-local selectors with parent-root participant addresses. If a child action needs a parent communication row, it uses a parent-boundary descriptor whose `delivery.teamRunId` is the parent run and whose sender participant is normalized to the parent-root route, for example `BuildSquad/review_lead`.

Parent-to-representative example:

```json
{
  "teamRunId": "team_nested-mixed-runtime-delivery-team_9585e151",
  "sender": {
    "memberKind": "agent",
    "memberName": "program_manager",
    "memberPath": ["program_manager"],
    "memberRouteKey": "program_manager",
    "address": { "teamRunId": "team_nested-mixed-runtime-delivery-team_9585e151", "memberPath": ["program_manager"], "memberRouteKey": "program_manager" }
  },
  "recipient": {
    "selector": { "kind": "route_key", "memberRouteKey": "BuildSquad/review_lead" },
    "memberKind": "agent",
    "memberName": "review_lead",
    "memberPath": ["BuildSquad", "review_lead"],
    "memberRouteKey": "BuildSquad/review_lead",
    "address": { "teamRunId": "team_nested-mixed-runtime-delivery-team_9585e151", "memberPath": ["BuildSquad", "review_lead"], "memberRouteKey": "BuildSquad/review_lead" },
    "representedSubTeam": {
      "memberName": "BuildSquad",
      "memberRunId": "team_member_...",
      "teamDefinitionId": "nested-build-squad-team",
      "address": { "teamRunId": "team_nested-mixed-runtime-delivery-team_9585e151", "memberPath": ["BuildSquad"], "memberRouteKey": "BuildSquad" }
    }
  },
  "content": "Please handle this work"
}
```

`MixedTeamManager.deliverInterAgentMessage()` responsibilities under this contract:

1. Treat `request.teamRunId` as the coordinate root/projection owner. A manager may execute the request only when it owns that root; a child manager receiving a parent-boundary descriptor must forward through `ParentBoundaryBridge` instead of resolving the parent selector locally.
2. Resolve the executable recipient handle from `request.recipient.selector`. For nested route/path selectors, the registry may return the top-level subteam handle, but the request recipient participant remains the actual nested leaf.
3. Publish one `COMMUNICATION` event using `request.sender` and `request.recipient` participants verbatim after normalizing defaults; `sourcePath` is `request.sender.memberPath`.
4. Attach delivery trace IDs using the actual recipient participant route, not the top-level subteam route.
5. Delegate to the resolved handle with the same request.

`MixedSubTeamMemberHandle.deliverInterMemberMessage()` responsibilities:

1. Ensure the child `TeamRun` exists.
2. If `request.recipient.address.memberPath` starts with this subteam's parent-root path, strip that prefix and build a child-local selector for the remaining path/route.
3. Call `childRun.postMessage(buildInterAgentDeliveryInputMessage(request), childSelector)` for representative delivery.
4. Use `childRun.postMessage(..., null)` only for structural subteam user/composer posts where no explicit nested representative selector is present.

Communication event/projection payload is concrete and represented-subteam-aware:

```ts
type TeamRunCommunicationEventPayload = {
  messageId: string;
  teamRunId: string;                    // same coordinate root as participant paths
  sender: TeamCommunicationParticipant;
  receiver: TeamCommunicationParticipant;
  content: string;
  messageType: string;
  referenceFiles: TeamCommunicationReferenceFile[];
  createdAt: string;
};
```

`representedSubTeam` flows end-to-end:

```text
MemberTeamRecipientDescriptor.participant.representedSubTeam
-> InterAgentMessageDeliveryRequest.sender/recipient.representedSubTeam
-> MixedTeamManager.buildCommunicationPayload().sender/receiver.representedSubTeam
-> TeamCommunicationService / team-communication-types.ts projection row
-> GraphQL/WebSocket communication DTOs
-> frontend TeamCommunicationStore sender/receiver representedSubTeam fields
-> activity/team-communication display badges/breadcrumbs
```

Concrete downward display/projection example:

```json
{
  "sourcePath": ["program_manager"],
  "sender": { "memberKind": "agent", "memberRouteKey": "program_manager" },
  "receiver": {
    "memberKind": "agent",
    "memberRouteKey": "BuildSquad/review_lead",
    "representedSubTeam": { "memberRouteKey": "BuildSquad", "teamDefinitionId": "nested-build-squad-team" }
  },
  "content": "Please review this PR"
}
```

Child processing appears separately through the child event bridge, for example:

```json
{
  "sourcePath": ["BuildSquad", "review_lead"],
  "data": { "memberName": "review_lead", "agentEvent": "..." }
}
```

## Full-Stack UI Validation Rework Decisions (2026-05-13)

Full-stack seeded browser validation proved that the backend nested runtime works but the frontend still presents a flattened team. This is now in scope. The frontend must model the same recursive member topology as the backend instead of treating nested support as a backend-only feature.

### UI-001: Recursive Team Member Tree Is The Frontend Display Contract

The active workspace tree, team member panel, grid, spotlight, run history, and restore views must use a recursive `TeamMemberNode`/`TeamMemberTreeNode` display model. A leaf-only list is no longer valid as the display source of truth.

Target frontend shape:

```ts
type TeamMemberNode =
  | {
      memberKind: 'agent';
      memberName: string;
      displayName: string;
      memberPath: string[];
      memberRouteKey: string;
      agentDefinitionId: string;
      memberRunId?: string | null;
    }
  | {
      memberKind: 'agent_team';
      memberName: string;
      displayName: string;
      memberPath: string[];
      memberRouteKey: string;
      teamDefinitionId: string;
      teamRunId?: string | null;
      coordinatorMemberRouteKey?: string | null;
      children: TeamMemberNode[];
    };
```

`TeamMemberNode` is frontend/tree data only. Backend live objects remain `MixedTeamMemberHandle`.

`AgentTeamContext` should stop using a flat `members` map as the topology owner. Target state:

```ts
interface AgentTeamContext {
  teamRunId: string;
  config: TeamRunConfig;
  memberTree: TeamMemberNode[];
  memberNodesByRouteKey: Map<string, TeamMemberNode>;
  leafAgentContextsByRouteKey: Map<string, AgentContext>;
  coordinatorMemberRouteKey?: string | null;
  focusedMemberRouteKey: string;
  currentStatus: AgentTeamStatus;
}
```

Derived leaf-agent maps are still needed for conversation/projection hydration, but they are indexes over `memberTree`; they must not decide what the user sees.

### UI-002: Draft/Launch Topology Comes From Definitions, Runtime/History Topology Comes From Metadata

Before a backend run exists, the frontend builds `TeamMemberNode` from nested team definitions. After create/restore/resume, backend `TeamRunMetadata.memberTree` is authoritative for the display tree because it includes child `teamRunId`s, actual leaf route keys, and restored runtime IDs.

`utils/teamDefinitionMembers.ts` should become a topology utility, not a flattening owner:

- build recursive definition nodes for display/config;
- derive leaf-agent nodes from the tree for launch configs;
- detect cycles/missing teams consistently;
- preserve parent subteam route prefixes, e.g. `BuildSquad/review_lead`;
- never return nested child leaves as parent-level display rows.

### UI-003: Launch Config Overrides Are Keyed By Canonical Route Key

`TeamRunConfig.memberOverrides` and `TeamMemberConfigInput.memberRouteKey` must use canonical route keys. For the validation fixture, overrides are keyed by:

```text
program_manager
BuildSquad/review_lead
BuildSquad/qa_specialist
```

The subteam row `BuildSquad` may show inherited/default configuration summary, but it does not carry `agentDefinitionId`, runtime kind, model, skill access, or workspace fields. Those fields belong only to leaf agent nodes. Flat child keys such as `review_lead` are ambiguous and rejected for nested children.

### UI-004: Selection, Focus, Grid, Spotlight, And Composer Target Member Nodes

The selected/focused identity is `focusedMemberRouteKey`, not `focusedMemberName`. It may point to either an `agent` leaf or an `agent_team` node.

- Agent leaf focus: render the existing agent monitor/conversation/projection using `leafAgentContextsByRouteKey[routeKey]`.
- Subteam focus: render a team/group focus panel with child list, status summary, breadcrumb, and composer targeting the subteam route key. Do not hydrate a subteam as an `AgentContext`.
- Grid/spotlight: render both `TeamMemberMonitorTile` for leaf agents and a new/extended `TeamMemberGroupTile` for subteam nodes. A subteam tile can expand or focus the group and show immediate children/status counts.
- Composer: sending while focused on `BuildSquad` calls the stream/API with `target_member_route_key: 'BuildSquad'` or equivalent selector and the backend routes to the child coordinator. Sending while focused on `BuildSquad/review_lead` targets that exact leaf route key.

Arbitrary cross-boundary bypass remains out of scope, but controlled child-to-immediate-parent reporting is in scope. Selecting a subteam still respects the subteam boundary; upward reporting uses scoped communication recipient descriptors and the parent-boundary bridge described in `CR-001` through `CR-009`, not direct child access to parent internals or stored reply state.

### UI-005: Run History And Restore Render `memberTree` Recursively

`runHistoryTypes.ts`, `runHistoryMetadata.ts`, `runHistoryTeamHelpers.ts`, `runHistoryReadModel.ts`, and history components must replace the flat `memberMetadata`/`members` display assumptions with recursive member-tree parsing and derived leaf projection helpers.

History tree behavior:

```text
Nested Mixed Runtime Delivery Team
  program_manager
  BuildSquad   [team]
    BuildSquad/review_lead
    BuildSquad/qa_specialist
```

The parent team run remains the only top-level history/active run. Internal child team runs are shown as nested member nodes under the parent, not as independent top-level history rows.

### UI-006: Streaming, Tool Approval, Activity, And Team Communication Use Path Identity

`TeamStreamingService.getMemberContext()` must resolve inbound events and status snapshots by canonical `source_path`/`member_route_key` (or equivalent path/route fields). `agent_name`/`agent_id` may be retained as display/trace metadata but are not nested routing authority and must not be used to recover ambiguous member routing. Tool approval commands should send `member_route_key`/`source_path` from the approval event; `agent_name` is not authoritative for nested leaves.

`TeamCommunicationStore` and activity panels should store/display participant identity with member kind, path, route key, and represented-subteam context. Parent communication should display `program_manager -> BuildSquad/review_lead` (or `program_manager -> review_lead` with a `BuildSquad` badge) as a parent-level message to the responsible representative; child processing appears separately as `BuildSquad/review_lead` events.

### UI-007: Frontend File Responsibilities Added By Validation

| File / Area | New Responsibility | Must Not Do |
| --- | --- | --- |
| `autobyteus-web/utils/teamDefinitionMembers.ts` | Build recursive `TeamMemberNode` trees and derived leaf-agent lists. | Use leaf flattening as display topology. |
| `autobyteus-web/types/agent/AgentTeamContext.ts` | Store `memberTree`, `memberNodesByRouteKey`, `leafAgentContextsByRouteKey`, and `focusedMemberRouteKey`. | Treat subteam nodes as `AgentContext`. |
| `autobyteus-web/stores/agentTeamContextsStore.ts` | Create/focus active team contexts from recursive trees; expose tree and leaf indexes separately. | Expose `teamMembers` from flat leaf map as UI source of truth. |
| `autobyteus-web/stores/agentTeamRunStore.ts` | Send route-key/path selectors for selected agent or subteam nodes; launch with canonical leaf route keys. | Send nested child flat names as `target_member_name` or any scalar alias. |
| `autobyteus-web/utils/teamRunMemberConfigBuilder.ts` | Build leaf launch configs from derived leaf-agent nodes keyed by route key. | Look up overrides by flat `memberName` for nested children. |
| `autobyteus-web/stores/runHistoryTypes.ts` / `runHistoryMetadata.ts` | Parse recursive metadata with `memberTree` and no `runVersion`. | Parse current metadata through flat `memberMetadata`. |
| `autobyteus-web/stores/runHistoryTeamHelpers.ts` / `runHistoryReadModel.ts` | Build recursive team tree rows from metadata/context. | Sort nested child leaves as parent-level siblings. |
| `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` and child history components | Render nested team member rows recursively with expand/collapse. | Render only `team.members` flat rows. |
| `autobyteus-web/components/workspace/team/TeamMembersPanel.vue` | Render active recursive member tree and coordinator badges by route key. | Compare coordinator using canonical route/path identity. |
| `autobyteus-web/components/workspace/team/TeamGridView.vue` / `TeamSpotlightView.vue` / `TeamWorkspaceView.vue` | Support agent tiles and subteam group tiles/focus states. | Assume every selected member has an `AgentContext`. |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` / protocol types | Send and approve with `source_path`, `member_route_key`, `target_member_route_key`, or path equivalents only. | Send command target aliases such as `target_member_name`, `target_agent_name`, `agent_name`, or `agent_id`; route nested events by those aliases. |
| `autobyteus-web/stores/teamCommunicationStore.ts` | Store/display sender/receiver participants by member kind/path/route. | Group conversations only by run ID and display name. |

## Full-Stack Round 5 Live Transcript / Projection / Presentation Rework Decisions (2026-05-13)

Round 5 validation exposed three coupled defects: live child coordinator transcripts omit inbound inter-agent prompts, opened child projections duplicate timestamped messages with `ts: null` copies, and active/history labels use different primary names. These are not separate component bugs. They reveal three missing invariants on DS-009, DS-015, and DS-017.

### R5-001: Backend Member Input Event Is The Authoritative Live Transcript Source

Recipient-side live user/inbound transcript entries must come from the backend delivery boundary that knows the actual receiving leaf route. The frontend must not synthesize child leaf user messages from parent-level `TEAM_COMMUNICATION_MESSAGE` events.

Reason:

- A parent communication event says `program_manager -> BuildSquad/review_lead` with represented-subteam context for `BuildSquad`.
- The child transcript entry belongs to the resolved child leaf, e.g. `BuildSquad/review_lead`.
- Only the backend child `TeamRun`/child manager knows whether the default target is `review_lead`, another coordinator, or a sole child member.

Add a domain-level member input event. The transport message can continue to use the existing `EXTERNAL_USER_MESSAGE` server-message type so frontend handlers remain conceptually aligned with "a user-visible input arrived", but the domain event should not be called external-channel-specific.

Target domain shape:

```ts
enum TeamRunEventSourceType {
  AGENT = 'AGENT',
  TEAM = 'TEAM',
  TASK_PLAN = 'TASK_PLAN',
  COMMUNICATION = 'COMMUNICATION',
  MEMBER_INPUT = 'MEMBER_INPUT',
}

type TeamRunMemberInputEventPayload = {
  messageId: string;
  dedupeKey: string;
  teamRunId: string;
  recipientMemberRunId: string;
  recipientMemberName: string;
  recipientMemberPath: string[];
  recipientMemberRouteKey: string;
  content: string;
  receivedAt: string;
  inputOrigin: 'user_message' | 'inter_agent_delivery';
  sender?: TeamCommunicationParticipant | null;
  parentCommunicationMessageId?: string | null;
  contextFilePaths?: Array<{ path: string; type?: string | null }>;
  referenceFiles?: TeamCommunicationReferenceFile[];
};
```

Mapping to WebSocket payload:

```json
{
  "type": "EXTERNAL_USER_MESSAGE",
  "payload": {
    "message_id": "input_...",
    "dedupe_key": "team:<parentTeamRunId>:member:BuildSquad/review_lead:input:<messageId>",
    "content": "You received a message from sender name: program_manager ...",
    "received_at": "2026-05-13T...",
    "input_origin": "inter_agent_delivery",
    "agent_id": "review_lead_member_run_id",
    "agent_name": "review_lead",
    "member_route_key": "BuildSquad/review_lead",
    "member_path": ["BuildSquad", "review_lead"],
    "source_route_key": "BuildSquad/review_lead",
    "source_path": ["BuildSquad", "review_lead"],
    "sender_member_route_key": "program_manager",
    "sender_member_path": ["program_manager"],
    "parent_communication_message_id": "teammsg_..."
  }
}
```

Producer rules:

- `MixedAgentMemberHandle.postMessage()` emits `MEMBER_INPUT` after an accepted user input reaches an agent leaf.
- `MixedAgentMemberHandle.deliverInterMemberMessage()` emits `MEMBER_INPUT` with `inputOrigin: 'inter_agent_delivery'` after the recipient-visible `AgentInputUserMessage` is accepted by the agent leaf.
- `MixedSubTeamMemberHandle` does not guess the child leaf itself. It posts into the child `TeamRun`; the child manager/agent handle emits the `MEMBER_INPUT`, and the existing child event bridge prefixes the child's `sourcePath` to the parent path.
- `MixedTeamManager.deliverInterAgentMessage()` still publishes one parent `COMMUNICATION` event for `program_manager -> BuildSquad/review_lead` with represented-subteam context. That event is for team communication panels/projections, not for the child leaf transcript.

If implementation chooses a smaller first patch, it may emit the same member input event from `MixedSubTeamMemberHandle` after resolving the returned child leaf context, but the steady-state owner should be the accepting child leaf handle so child subscribers and parent bridged subscribers observe the same event.

### R5-002: One Delivery Trace Links Parent Communication, Recipient Input, Live Event, And Projection

When a parent agent sends to a subteam representative, there are two user-visible records:

1. Parent team communication row: `program_manager -> BuildSquad/review_lead` (displayable as `program_manager -> review_lead` with `BuildSquad` badge), original content.
2. Child coordinator transcript row: `BuildSquad/review_lead` user/inbound prompt, recipient-visible content (`You received ...`).

They must be linked but not conflated. Generate or carry a single delivery trace:

```ts
type InterAgentDeliveryTrace = {
  communicationMessageId: string;
  recipientInputMessageId: string;
  createdAt: string;
};
```

Rules:

- `MixedTeamManager.deliverInterAgentMessage()` generates `communicationMessageId`, `recipientInputMessageId`, and `createdAt` once.
- The parent `COMMUNICATION` event uses `communicationMessageId`.
- `buildInterAgentDeliveryInputMessage()` writes `recipientInputMessageId`, `communicationMessageId`, sender path/route, receiver path/route, and `createdAt` into the delivered `AgentInputUserMessage` metadata.
- The child/leaf `MEMBER_INPUT` event echoes `recipientInputMessageId` as `message_id` and links `parent_communication_message_id`.
- Durable projection providers should expose `messageId`/`dedupeKey` from input metadata when possible. If a provider cannot expose it, projection dedupe falls back to semantic keys.

For direct frontend sends, `TeamStreamingService.sendMessage()` should generate a client message ID and send it in the payload; the frontend's optimistic user message and backend `MEMBER_INPUT` echo use the same ID/dedupe key so they upsert rather than duplicate.

### R5-003: Live Child Conversation And Durable Projection Use The Same Logical Message

The live central transcript for a leaf agent is built from two kinds of records:

- user/inbound records from `EXTERNAL_USER_MESSAGE` transport events sourced by `MEMBER_INPUT`;
- assistant/tool/status records from agent runtime events.

The team communication panel is separate. It is built from `TEAM_COMMUNICATION_MESSAGE`/communication projection records.

Frontend rules:

- `handleExternalUserMessage()` must upsert, not blindly push, when `message_id` or `dedupe_key` is present.
- `TeamStreamingService.getMemberContext()` routes `EXTERNAL_USER_MESSAGE` by `source_path`/`member_route_key` first; if the event says `BuildSquad/review_lead`, it must update that leaf context even when the currently focused node is `BuildSquad` or `program_manager`.
- `handleTeamCommunicationMessage()` only updates `TeamCommunicationStore`; it must not append to leaf conversations.
- `handleInterAgentMessage()` must not be the canonical recipient transcript path for mixed team communication. If retained for legacy runtime events, render it as activity/segment metadata only and do not use it to represent the recipient-visible user prompt.

Expected seeded flow:

```text
program_manager send_message_to review_lead
  -> TeamCommunicationStore: one message program_manager -> BuildSquad/review_lead, representedSubTeam=BuildSquad
  -> Leaf conversation BuildSquad/review_lead:
       user: You received a message from sender name: program_manager ...
       assistant: FRONTEND_PARENT_TO_SUBTEAM...
```

### R5-004: Projection Deduplication Is Owned By Backend Projection Normalization, With Frontend Defense

The duplicate `ts: null` entries are caused by merging projection sources as raw JSON rows. Exact JSON equality cannot dedupe rows that represent the same logical message but differ by timestamp/source metadata.

Primary owner:

```text
autobyteus-server-ts/src/run-history/projection/run-projection-dedupe.ts
```

or an equivalent owned normalizer invoked by:

```text
autobyteus-server-ts/src/run-history/services/agent-run-view-projection-service.ts
autobyteus-server-ts/src/run-history/services/team-member-run-view-projection-service.ts
```

Backend rule:

- `getTeamMemberRunProjection()` must return deduped conversation rows.
- `AgentRunViewProjectionService.mergeProjectionBundles()` must call semantic dedupe when merging `localProjection`, primary provider projection, and fallback provider projection.

Dedupe key order:

1. `messageId` / `message_id` / `dedupeKey` / `dedupe_key` when present.
2. For recipient inputs: `runId + memberRouteKey + role + normalized(content) + senderRouteKey + receiverRouteKey + inputOrigin`.
3. For assistant messages: `runId + role + normalized(content) + nearest valid timestamp bucket` when timestamp exists.
4. Defensive fallback only: collapse adjacent or same-merge-batch entries with the same `kind`, `role`, normalized content/tool identity where one copy has `ts == null` and the other has a valid `ts`.

Winner/merge policy:

- Prefer the row with a valid non-null timestamp.
- Prefer the row with explicit message identity (`messageId`/`dedupeKey`).
- Prefer the richer row by field count and non-empty media/tool/reference metadata.
- Merge missing optional fields from the discarded row when they do not conflict.
- Preserve stable chronological order after dedupe; null-only rows remain in source order after timestamped rows they cannot match.

Frontend defense:

- `autobyteus-web/services/runHydration/runProjectionConversation.ts` should also dedupe projection entries before converting to `Conversation`.
- This frontend dedupe is a safety net for stale payloads or provider edge cases; it is not the authoritative fix. Backend GraphQL must already return no duplicate logical rows for current data.

### R5-005: Primary Label Policy Is Membership Identity, Not Agent Definition Identity

Nested team rows represent team membership slots. The primary label must be stable across active, opened, stopped, and history views.

Policy:

- Primary label: `TeamMemberNode.displayName` if present, else `TeamMemberNode.memberName`, else the last route segment.
- Subteam primary label: subteam membership name, e.g. `BuildSquad`; show a `TEAM` badge and optional team definition name as secondary text/tooltip.
- Leaf primary label: leaf membership name, e.g. `review_lead`; in a nested tree the parent row already gives the breadcrumb. In flat contexts/tooltips, show full route key `BuildSquad/review_lead` as secondary metadata.
- Agent definition display name, e.g. `Nested Review Lead Agent`, is secondary metadata/tooltip/avatar lookup input only. It must not override the primary row label.
- Full route key remains always available for debugging/copy/tooltip and command identity, but it should not accidentally become the primary label unless there is no better membership label.

Implementation boundary:

```text
autobyteus-web/composables/useTeamMemberPresentation.ts
```

should become the single label/presentation owner. Row builders and components must not independently prefer `memberContext.config.agentDefinitionName`.

Affected active/history builders:

- `autobyteus-web/stores/runHistoryTeamRows.ts`
- `autobyteus-web/stores/runHistoryTeamHelpers.ts`
- `autobyteus-web/components/workspace/running/TeamMemberRow.vue`
- `autobyteus-web/components/workspace/team/TeamMembersPanel.vue`
- `autobyteus-web/components/workspace/team/TeamGridView.vue`
- `autobyteus-web/components/workspace/team/TeamSpotlightView.vue`
- `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue`

### R5-006: Regression Expectations For Round 5

Add or update tests to prove:

- backend `AgentTeamStreamHandler.convertTeamEvent()` maps `MEMBER_INPUT` to `EXTERNAL_USER_MESSAGE` with `source_path`, `member_route_key`, `message_id`, and `dedupe_key`;
- parent-to-subteam delivery produces one parent communication event and one child leaf member-input event after bridge prefixing;
- frontend `TeamStreamingService` routes a live `EXTERNAL_USER_MESSAGE` for `BuildSquad/review_lead` into that leaf conversation while focused on `program_manager`, `BuildSquad`, or `BuildSquad/review_lead`;
- `handleExternalUserMessage()` upserts by `message_id`/`dedupe_key` and does not duplicate optimistic direct leaf sends;
- `getTeamMemberRunProjection()` returns no duplicate timestamp/null pairs for seeded `BuildSquad/review_lead`;
- `buildConversationFromProjection()` defensively dedupes duplicate rows if a stale payload still contains them;
- active and history tree rows use the same primary labels for the seeded team: `program_manager`, `BuildSquad`, `review_lead`, `qa_specialist`.


## Communication Roster / Representative Refactor Decisions (2026-05-13)

Follow-up requirements discussion refined the upward-reporting design. The previous `reply_to_sender` idea is rejected. The runtime should model organization communication by exposing real visible member names in each member's scoped communication roster, while the backend keeps structural topology and routing boundaries explicit.

The core separation is:

```text
structural topology:        program_manager, BuildSquad -> review_lead, qa_specialist
communication roster view: program_manager sees review_lead as BuildSquad representative
                            BuildSquad/review_lead sees qa_specialist and program_manager
```

Structural `agent_team` nodes remain first-class tree nodes for execution, metadata, UI, user composer targeting, and lifecycle. `send_message_to` does not normally expose the abstract subteam node name; it exposes the responsible coordinator/representative member name. The descriptor behind that visible name carries the structural subteam route and actual coordinator route.

### CR-001: Structural Tree And Communication Roster Are Different Owned Projections

Do not use the structural `members` list as the authoritative `send_message_to` roster.

- Structural tree owner: topology/config/metadata/frontend display. It preserves `BuildSquad` as an `agent_team` node.
- Communication roster owner: backend member communication context. It exposes the names the current agent may call through `send_message_to`.
- Tool adapters consume the communication roster descriptors only. They must not infer recipients by searching structural `members` directly.

For the seeded team:

```text
Parent structural members:
- program_manager
- BuildSquad [agent_team]

program_manager communication recipients:
- review_lead     representedTeam: BuildSquad, actualRoute: BuildSquad/review_lead

BuildSquad/review_lead communication recipients:
- qa_specialist   local child teammate, actualRoute: qa_specialist inside child run / BuildSquad/qa_specialist in root path
- program_manager parent-boundary member, actualRoute: program_manager in parent/root run
```

### CR-002: Use One Scoped Communication Recipient Descriptor Coordinate System

`MemberTeamRecipientDescriptor` uses the canonical coordinate and participant shapes defined in `ARCH-COMM-001+002 Resolution`. Do not reintroduce parallel fields such as `targetTeamRunId`, `targetSelector`, `actualMemberPath`, and `actualMemberRouteKey` outside the `delivery` and `participant.address` objects.

Target shape:

```ts
type MemberTeamRecipientDescriptor = {
  recipientName: string;        // accepted tool argument, e.g. 'review_lead', 'program_manager'
  displayName: string;
  recipientScope: CommunicationRecipientScope;
  delivery: {
    teamRunId: string;          // coordinate root / manager entry target
    selector: TeamMemberSelector; // relative to delivery.teamRunId; generated descriptors prefer route_key
  };
  participant: TeamCommunicationParticipant & { address: TeamMemberAddress };
};
```

Important tightening:

- No reply alias scope, no stored reply-state scope, and no `replyAddress` routing field.
- No kitchen-sink optional address fields that duplicate `delivery.selector` or `participant.address`.
- `recipientName` must be unique within the current member's roster.
- `participant.representedSubTeam` exists only when the visible recipient is acting as a subteam representative.
- `participant.address.teamRunId`, `delivery.teamRunId`, and any represented-subteam address `teamRunId` must match.

`MemberTeamContext` target shape:

```ts
class MemberTeamContext {
  members: MemberTeamDescriptor[];                    // structural same-boundary members only
  communicationRecipients: MemberTeamRecipientDescriptor[];
  allowedRecipientNames: string[];                    // derived from communicationRecipients for runtime tool schema only
}
```

### CR-003: Communication Roster Builder Owns Visibility Policy

Add a single backend owner, tentatively:

```text
autobyteus-server-ts/src/agent-team-execution/services/member-communication-roster-builder.ts
```

Responsibilities:

1. Build local recipients for the current member's own team boundary.
2. Replace structural subteam recipients with the subteam coordinator/representative when building communication-visible recipients for parent members.
3. For a subteam coordinator, combine:
   - local child-team recipients, excluding itself;
   - exposed immediate parent-boundary recipients, excluding the represented subteam/self;
   - sibling subteam coordinators only as representatives if explicitly exposed by the parent roster policy.
4. Reject duplicate visible `recipientName` values in the current roster.
5. Provide enough presentation metadata for an LLM-facing team membership roster manifest: human team name, current member role in that team context, visible team members, representative/subteam context, and exact messageable `recipientName` values.

The initial required policy is immediate-parent only. Do not expose grandparents, unrelated runs, sibling subteam internals, or every child member to the parent. The builder may own visibility and grouping metadata, but it must not turn prompt presentation into a second routing authority; routing remains descriptor-based.

### CR-003a: LLM Roster Is A Team Membership Manifest

The LLM should receive organization language, not runtime routing jargon. `MemberRunInstructionComposer` should render the current member's scoped `communicationRecipients` through a manifest shape such as:

```ts
type TeamMembershipRosterManifest = {
  currentMemberName: string;
  teams: TeamMembershipRosterTeam[];
  allowedRecipientNames: string[]; // exact send_message_to recipient_name values
};

type TeamMembershipRosterTeam = {
  teamName: string;                // e.g. 'BuildSquad' or 'Delivery Leadership Team'
  teamRouteKey?: string | null;
  currentMemberRole: string;       // e.g. 'coordinator' or 'BuildSquad representative'
  members: Array<{
    memberName: string;
    displayName?: string | null;
    isSelf?: boolean;
    canMessage?: boolean;
    recipientName?: string | null; // present only when this row is a valid send_message_to target
    representsTeamName?: string | null;
  }>;
};
```

Example for the subteam coordinator:

```text
Team membership roster

You are: review_lead

You are a member of these teams:

1. BuildSquad
   Your role: coordinator
   Team members:
   - review_lead (you)
   - qa_specialist

   You can message:
   - qa_specialist

2. Delivery Leadership Team
   Your role: BuildSquad representative
   Team members:
   - program_manager
   - review_lead (you, representing BuildSquad)

   You can message:
   - program_manager

When using send_message_to, recipient_name must exactly match one of:
- qa_specialist
- program_manager
```

Example for the parent member:

```text
Team membership roster

You are: program_manager

You are a member of these teams:

1. Delivery Leadership Team
   Team members:
   - program_manager (you)
   - review_lead (BuildSquad representative)

   You can message:
   - review_lead

When using send_message_to, recipient_name must exactly match one of:
- review_lead
```

Rules:

- The manifest is derived from `communicationRecipients` and structural/team metadata; it is not a separate resolver.
- Tool schema enums still derive from `communicationRecipients.map(r => r.recipientName)`.
- Instruction text must not use implementation labels such as `local_agent`, `parent_boundary_agent`, `local child-team recipients`, or `parent-boundary recipients` as the primary LLM-facing grouping language.
- Team names should use user-facing team definition/display names when available, with route keys only as secondary/debug metadata.
- The exact allowed `recipient_name` list remains mandatory, because it is the operational contract the LLM must follow.

### CR-004: Parent-To-Subteam Communication Targets The Representative Name, Routes Through The Subteam Boundary

Parent member prompt/tool exposure should not list `BuildSquad` as the normal communication target. It should list the responsible coordinator/member, e.g. `review_lead`, with secondary represented-team context.

Delivery spine:

```text
program_manager send_message_to('review_lead')
-> tool adapter resolves communicationRecipients['review_lead']
-> descriptor.delivery.selector = route_key('BuildSquad/review_lead')
-> parent MixedTeamManager resolves top-level BuildSquad handle from the nested selector
-> MixedSubTeamMemberHandle strips BuildSquad prefix and calls childRun.postMessage(..., route_key('review_lead'))
-> child coordinator receives backend-delivered member input
```

This means `MixedSubTeamMemberHandle.deliverInterMemberMessage()` must stop blindly calling `childRun.postMessage(..., null)` for every inter-member delivery. If the parent request target is nested under the subteam path, the subteam handle strips the top-level segment and passes the child selector explicitly. It may still use `null` for a user/composer message addressed to the subteam group itself.

Communication event identity:

- sender: `program_manager`
- receiver: actual leaf `BuildSquad/review_lead`
- representedSubTeam: `BuildSquad`
- event `sourcePath`: `['program_manager']`

This preserves the fact that the visible person/member is `review_lead`, while also preserving that routing crossed the `BuildSquad` boundary.

### CR-005: Child Coordinator Upward Reporting Uses Parent-Boundary Recipient Descriptors, Not Reply State

A child coordinator reports upward by direct visible name:

```text
BuildSquad/review_lead send_message_to('program_manager')
```

No `reply_to_sender` alias is exposed. No previous inbound message state is required to route this. The child coordinator's `communicationRecipients` contains a `parent_boundary_agent` descriptor for `program_manager` because the coordinator is acting as `BuildSquad` representative.

Upward delivery spine:

```text
BuildSquad/review_lead send_message_to('program_manager')
-> child tool adapter resolves communicationRecipients['program_manager']
-> request carries descriptor.delivery.teamRunId = parentTeamRunId and descriptor.delivery.selector = route_key('program_manager')
-> child MixedTeamManager delegates through ParentBoundaryBridge
-> parent MixedTeamManager.deliverInterAgentMessage receives normalized sender path BuildSquad/review_lead
-> parent communication event records BuildSquad/review_lead -> program_manager
-> parent MixedAgentMemberHandle delivers recipient-visible input to program_manager
```

`ParentBoundaryBridge` remains the right mechanism, but it should carry parent-boundary recipient descriptors rather than reply contexts:

```ts
type ParentBoundaryBridge = {
  parentTeamRunId: string;
  subTeamMemberName: string;
  subTeamMemberPath: string[];
  subTeamMemberRouteKey: string;
  communicationRecipients: MemberTeamRecipientDescriptor[];
  deliverToParent: InterAgentMessageDeliveryHandler;
};
```

The serializable identity fields may live in `MixedTeamRunContext`; the function handler belongs to factory/manager wiring and must not be persisted into metadata.

### CR-006: Delivery Request Uses Participant Objects, Not Loose Optional Scalar Identity Fields

`InterAgentMessageDeliveryRequest` uses the participant-object shape from `ARCH-COMM-001+002 Resolution`:

```ts
interface InterAgentMessageDeliveryRequest {
  teamRunId: string; // coordinate root/projection owner
  sender: InterAgentDeliveryParticipant;
  recipient: InterAgentDeliveryParticipant & { selector: TeamMemberSelector };
  content: string;
  messageType?: string | null;
  referenceFiles?: string[] | null;
  parentCommunicationMessageId?: string | null;
  recipientInputMessageId?: string | null;
  recipientInputDedupeKey?: string | null;
}
```

Do not retain a second authoritative identity model made from optional `senderMemberName`, `senderPath`, `recipientRouteKey`, `representedRecipientSubTeam`, or similar scalar fields. If edge adapters still receive those fields from older transport payloads, they must normalize them into `sender` / `recipient` participants before entering `MixedTeamManager.deliverInterAgentMessage()`.

The parent `MixedTeamManager.buildCommunicationPayload()` must use `request.sender` and `request.recipient` as the communication participants. In particular, upward reports must publish `sourcePath: ['BuildSquad', 'review_lead']`, not `[]`, and downward representative deliveries must publish receiver route `BuildSquad/review_lead` with `receiver.representedSubTeam = BuildSquad`.

### CR-007: Prompt And Tool Adapters Use The Same Descriptor Boundary Across Runtimes

Affected adapters:

```text
autobyteus-server-ts/src/agent-execution/backends/codex/team-communication/*
autobyteus-server-ts/src/agent-execution/backends/claude/team-communication/*
autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-team-communication-context-builder.ts
```

Rules:

- Tool schema enum derives from `communicationRecipients.map(r => r.recipientName)`.
- Handler lookup resolves against `communicationRecipients`, not `members`.
- Handler passes descriptor `delivery`, `participant`, represented-subteam metadata, and scope into the participant-shaped delivery request.
- `composeMemberRunInstructions()` renders the team membership roster manifest from the same descriptors and must not present parent recipients as fake local teammates or expose routing-scope labels as the primary LLM-facing organization model.

### CR-007a: Command Transport Removes Scalar Target Aliases

Round 20 code review found the previous design/docs still allowed scalar edge aliases such as `target_member_name`, `target_agent_name`, command-side `agent_name`, and command-side `agent_id`. The refined no-legacy decision is to remove those command inputs cleanly.

Target command contract:

- Public/domain `TeamMemberSelector` has only `{ memberPath }` and `{ memberRouteKey }` variants. It does not have a `top_level_name`/top-level-name variant. If mixed dispatch needs an executable top-level handle, it derives that internal segment from `memberPath[0]` or the first `memberRouteKey` segment after path/route validation.
- `selectorFromMemberName` and `selectorFromOptionalTargetName` must be deleted or replaced for public/domain command paths; they must not remain as compatibility adapters that accept scalar names.
- WebSocket and GraphQL team `SEND_MESSAGE` targets accept only:
  - `target_member_path` / `targetMemberPath`; or
  - `target_member_route_key` / `targetMemberRouteKey`.
- Team tool approval/denial targets accept only route/path identity from the approval request event:
  - `source_path` / `sourcePath`, `member_path` / `memberPath`, or `target_member_path` / `targetMemberPath`; or
  - `source_route_key` / `sourceRouteKey`, `member_route_key` / `memberRouteKey`, or `target_member_route_key` / `targetMemberRouteKey`.
- Scalar command target aliases are invalid input and must produce a clear invalid-target error:
  - `target_member_name`, `targetMemberName`;
  - `target_agent_name`, `targetAgentName`;
  - command-side `agent_name`, `agentName`;
  - command-side `agent_id`, `agentId`;
  - `member_name`, `memberName` when used as a command target.

This does not prevent outbound events from carrying display metadata such as member names or runtime IDs. The rule is specifically that outbound/display aliases are never accepted back as command target inputs. Frontend services, runtime E2E helpers, and protocol docs must send structured selectors only.

### CR-007b: App Data Migration Boundary For Legacy Team Metadata

The Electron build surfaced old flat team-run metadata in user data:

```json
{
  "teamRunId": "team_software-engineering-team_eefd62ea",
  "runVersion": 1,
  "memberMetadata": [
    { "memberRouteKey": "solution_designer", "memberName": "solution_designer", "memberRunId": "..." }
  ]
}
```

The target recursive schema can represent this old non-nested team as a one-level `memberTree`, so the product should migrate the data rather than leak a raw unsupported parser error. The architectural boundary is:

- Normal runtime/read/restore/frontend parser code accepts only canonical `TeamRunMetadata.memberTree`.
- A separate app data migration subsystem owns one-time conversion of known historical persisted data.
- Migration status is recorded in the application database and exposed in Settings -> Server -> Migrations.
- Failed migration attempts are visible and retryable; normal Agents/workspace/sidebar UI remains usable and does not render raw metadata exception text.

Specific migration: `20260517_team_run_metadata_member_tree` (or project timestamp equivalent).

Conversion rule for each legacy member:

```ts
const memberTreeEntry = {
  memberKind: 'agent',
  memberPath: [legacy.memberRouteKey || legacy.memberName],
  memberRouteKey: legacy.memberRouteKey || normalize(legacy.memberName),
  memberName: legacy.memberName,
  memberRunId: legacy.memberRunId,
  runtimeKind: legacy.runtimeKind,
  platformAgentRunId: legacy.platformAgentRunId ?? null,
  agentDefinitionId: legacy.agentDefinitionId,
  llmModelIdentifier: legacy.llmModelIdentifier,
  autoExecuteTools: legacy.autoExecuteTools,
  skillAccessMode: legacy.skillAccessMode,
  llmConfig: legacy.llmConfig ?? null,
  workspaceRootPath: legacy.workspaceRootPath ?? null,
  applicationExecutionContext: legacy.applicationExecutionContext ?? null,
};
```

The output removes `runVersion`, renames `memberMetadata` to `memberTree`, preserves root fields (`teamRunId`, definition fields, coordinator route, timestamps, `archivedAt`), validates the converted payload with the current canonical validator, writes a backup, then atomically replaces `team_run_metadata.json`. Current-format files are skipped. Invalid files are recorded as failed items without corrupting source data.

### CR-008: UI And Projection Perspective Rules

The structural UI stays nested:

```text
Nested Mixed Runtime Delivery Team
  program_manager
  BuildSquad [team]
    review_lead
    qa_specialist
```

Team communication displays actual participants plus representation context:

- Downward: `program_manager -> review_lead` with `BuildSquad` as secondary badge/breadcrumb.
- Upward: `BuildSquad / review_lead -> program_manager`.
- Focused `program_manager` leaf conversation: one inbound backend-delivered member input for upward reports.
- Focused `BuildSquad` group Team Messages: communication rows involving descendants of `BuildSquad` may be shown as group perspective rows.
- Focused `BuildSquad/review_lead` leaf: normal tool call/result and assistant transcript; do not synthesize a second user prompt for messages it sends.

Projection dedupe from Round 5 still applies. Communication rows and recipient input transcript rows are linked by trace IDs but not conflated, and each logical transcript message renders once.

### CR-009: Regression Expectations For Communication Roster Refactor

Add or update tests to prove:

- `MemberCommunicationRosterBuilder` exposes `review_lead` to `program_manager` as the `BuildSquad` representative and does not expose abstract `BuildSquad` as the normal `send_message_to` recipient.
- `MemberCommunicationRosterBuilder` exposes `qa_specialist` and `program_manager` to `BuildSquad/review_lead`, grouped by local child-team vs parent-boundary scope.
- Duplicate visible recipient names in one scoped roster fail tool exposure/delivery with a clear ambiguity error.
- `BuildSquad/review_lead` instructions render named team contexts such as `BuildSquad` and `Delivery Leadership Team`, show `review_lead` as self/coordinator/representative, list messageable members under each context, and end with exact allowed recipient names (`qa_specialist`, `program_manager`) without using technical routing-scope labels as headings.
- Codex, Claude, and AutoByteus team communication adapters resolve `recipient_name` against `communicationRecipients`, not structural `members`.
- Parent `send_message_to('review_lead')` routes through `BuildSquad` and delivers to child route `review_lead`; the parent communication event receiver is `BuildSquad/review_lead` with represented-subteam metadata.
- Child `send_message_to('program_manager')` routes through the `ParentBoundaryBridge`, publishes a parent communication event with `sourcePath: ['BuildSquad', 'review_lead']`, and delivers one live/durable member input to `program_manager`.
- No `reply_to_sender`, `replyAddress`, or stored reply context is required for upward routing.
- Attempts to send from a child member to an unexposed parent/sibling/grandparent route are rejected with a clear error.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / Larger Requirement
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue; Shared Structure Looseness; Missing Invariant
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: Current mixed manager originally owned `Map<string, AgentRun>` and `ensureMemberReady(): Promise<AgentRun>`; current run config and metadata required agent-only fields; launch traversal flattened nested teams. The 2026-05-13 full-stack validation additionally proved `autobyteus-web` still flattens nested active UI members through `resolveLeafTeamMembers()` and omits `BuildSquad` even when backend `memberTree` is recursive. The 2026-05-17 git/status investigation shows `origin/personal` already merged initializing UX, but later nested-branch status cleanup removed provider-edge startup mapping and current frontend code still writes canonical `initializing`, competing with backend snapshots/events for the same status field.
- Design response: Introduce recursive team topology planning, make `MixedTeamManager` own member handles instead of `AgentRun`s directly, add a scoped communication roster/representative projection for `send_message_to`, make the frontend own a recursive `TeamMemberNode` tree with derived leaf lookups instead of flat display members, and add an explicit backend-owned runtime status startup spine for backend lifecycle transitions, provider-edge canonicalization, frontend passive rendering/local pending UI separation, and nested member snapshot identity.
- Refactor rationale: Adding an `if subteam` branch inside agent-only backend maps, runtime tool handlers, or frontend leaf-only component loops would violate the authoritative boundary rule and spread structural-vs-communication roster distinctions across launch, runtime, events, restore, and UI display.
- Intentional deferrals and residual risk, if any: Arbitrary cross-level leaf-to-leaf messaging remains out of scope, but controlled child-to-immediate-parent reporting and parent-to-subteam-representative communication are now in scope because manual full-stack validation and user discussion showed abstract-subteam/top-down-only delegation is incomplete. Frontend nested tree/config/workspace/history/activity behavior remains in scope because seeded browser validation proved flatten-only UI is user-visible wrong.

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

- Policy: `No runtime backward compatibility and no legacy restore paths for this change; use explicit data migrations for known historical persisted data.`
- Required action: replace flat-only team-run config/metadata as the authoritative mixed nested representation. Do not preserve a mixed nested execution mode that flattens subteams into leaf agents.
- Existing single-runtime flat managers may stay for non-nested teams, but they must not be used as the nested-team implementation.
- Canonical recursive `TeamRunMetadata` is the only authoritative restore schema. Do not add a version-suffixed metadata type or `runVersion`. Do not retain dual schemas, fallback readers, topology guessing from current definitions, or runtime recovery paths for old flat metadata. Known historical flat metadata is upgraded by registered app data migration before normal runtime/history hydration; if unmigrated legacy data appears at runtime, it is classified as legacy-unmigrated/unavailable and surfaced only through controlled diagnostics/UI, not raw sidebar errors.

## Data-Flow Spine Inventory

The spine inventory is intentionally complete across the approved use cases. Implementation should start from these spines, not from the file list. File ownership below is derived from these flows.

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Covered Use Cases | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | UC-001, UC-007 | Root team definition ID plus launch/default settings | Validated recursive executable topology or validation failure | `TeamDefinitionTopologyPlanner` under `TeamRunService` | This is the first place nested topology can be preserved or accidentally flattened. It owns cycle checks, missing refs, coordinator-agent invariants, route keys, and duplicate/ambiguous identity rejection. |
| DS-002 | Primary End-to-End | UC-001, UC-010 | Frontend draft team definition tree and user overrides | `TeamMemberConfigInput[]` for leaf agents keyed by canonical nested route keys | Frontend topology utilities + `teamRunMemberConfigBuilder` | Prevents the frontend launch path from losing `BuildSquad/review_lead` identity before the backend sees the run request. |
| DS-003 | Primary End-to-End | UC-001 | GraphQL/create-run request | Top-level parent `TeamRun` with mixed backend, recursive context, and initial metadata seed | `TeamRunService` | Keeps backend selection and top-level run registration centralized; nested definitions route to mixed and child teams are not registered as top-level runs. |
| DS-004 | Primary End-to-End | UC-002, UC-003, UC-007, UC-009 | WebSocket/GraphQL/tool command target payload or `send_message_to` recipient | `TeamMemberSelector` entering `TeamRun`/backend/domain command chain | Transport adapters + `team-run-member-identity.ts` | Raw names must stop at edges. Every runtime command must carry path/route identity before it reaches a manager. |
| DS-005 | Primary End-to-End | UC-009, UC-011 | User composer sends to an agent leaf route key | Target leaf `AgentRun` receives user input and live/durable transcript identity is established | `MixedTeamManager` + `MixedAgentMemberHandle` | Direct leaf sends remain normal agent conversations, but backend and frontend must share message identity to avoid duplicate optimistic/live rows. |
| DS-006 | Primary End-to-End | UC-002, UC-009, UC-011 | User composer sends to an `agent_team` route key such as `BuildSquad` | Child team default/coordinator leaf receives the input and live child transcript shows the user prompt | `MixedSubTeamMemberHandle` + child `TeamRun` | This is the user-to-department flow. The parent does not know the child coordinator transcript until the child team resolves it. |
| DS-007 | Primary End-to-End | UC-003, UC-011 | Parent agent tool call `send_message_to({ recipient_name: 'review_lead' })` where `review_lead` represents `BuildSquad` | Parent communication projection records `program_manager -> BuildSquad/review_lead` with represented-subteam metadata; child coordinator receives recipient-visible prompt | `MemberCommunicationRosterBuilder` + `MixedTeamManager.deliverInterAgentMessage` + `MixedSubTeamMemberHandle` | This is the company/department collaboration path. It must produce both parent-level communication and child leaf transcript without exposing abstract subteam names as normal tool recipients. |
| DS-008 | Primary End-to-End | UC-004 | Child coordinator/leaf sends to another child member | Child leaf/member receives the work within the child team boundary | Child `MixedTeamManager` | Proves nested teams remain real teams internally, not only parent-visible groups. |
| DS-009 | Return-Event | UC-002, UC-003, UC-009, UC-011 | Accepted backend-delivered member input | Frontend leaf conversation contains exactly one user message for the actual recipient leaf | Backend `TeamMemberInputEvent` producer + `TeamStreamingService` | This is the missing Round 5 live transcript spine. The backend, not the frontend, owns the resolved child coordinator and exact recipient-visible prompt. |
| DS-010 | Return-Event | UC-005, UC-011 | Agent runtime output/tool/status event from root or child leaf | Parent WebSocket/client receives event routed by canonical `sourcePath` | `MixedAgentMemberHandle` / `MixedTeamEventBridge` | Keeps output, tools, statuses, and child replies attached to `BuildSquad/review_lead`, not to a flat or focused fallback member. |
| DS-011 | Return-Event | UC-003, UC-005, UC-008 | Parent team communication event | Backend communication projection and frontend Team Messages panel show sender/receiver participants with kind/path/route and represented-subteam context | `TeamCommunicationService` + `TeamCommunicationStore` | Parent-level `program_manager -> BuildSquad/review_lead` belongs in communication panels, not as a fake leaf user prompt or an abstract subteam-as-agent row. |
| DS-012 | Primary End-to-End | UC-005, UC-007 | Nested leaf tool approval request | Approval command targets the exact nested leaf and reaches the correct handle | Tool approval token/payload mapper + `TeamMemberSelector` chain | Prevents approval by ambiguous leaf names such as `review_lead` when the organization repeats roles. |
| DS-013 | Return-Event | UC-006, UC-008 | Runtime context/metadata refresh trigger | Canonical recursive `TeamRunMetadata.memberTree` persisted for the parent run | `TeamRunMetadataMapper` + `TeamRunMetadataStore` | Stores child team run IDs and leaf platform IDs inside the parent topology without a flat compatibility schema. |
| DS-014 | Primary End-to-End | UC-006 | Restore active/stopped parent team run | Recursive parent context restored; child team handles remain parent-owned and lazy | `TeamRunService` + `TeamRunMetadataMapper` + `MixedTeamRunBackendFactory` | Prevents restore from either flattening child leaves or registering child teams as independent top-level runs. |
| DS-015 | Primary End-to-End / Return-Event | UC-006, UC-011 | `getTeamMemberRunProjection(teamRunId, memberRouteKey)` and frontend history open | One deduped hydrated leaf conversation, with timestamped rows preferred over `ts: null` duplicates | `AgentRunViewProjectionService` with projection dedupe normalizer; frontend hydration defensive dedupe | This is the Round 5 opened/restored duplicate-message spine. It must be solved at projection ownership, not only in one component. |
| DS-016 | Primary End-to-End | UC-008, UC-009 | Definition/metadata `memberTree` enters frontend state | Workspace tree, team panel, grid, and spotlight render recursive member nodes and focus agent/team nodes correctly | `AgentTeamContextsStore` | Prevents frontend flattening such as showing `review_lead` as a sibling of `BuildSquad`. |
| DS-017 | Primary End-to-End | UC-008, UC-011 | A team/member row is built from active context or history metadata | Stable primary label plus secondary route/definition metadata | `useTeamMemberPresentation` + row builders | This is the Round 5 active/history label spine. The same member must not appear as `Nested Review Lead Agent` in one view and `review_lead` in another. |
| DS-018 | Bounded Local | UC-006 | Parent interrupt/terminate command | All active agent and child team handles interrupted/terminated; subscriptions cleared | `MixedTeamManager` | Prevents orphaned child teams/agents and stale bridges. |
| DS-019 | Primary End-to-End | UC-006, UC-008 | Run-history read model builds workspace tree | Parent team appears once as top-level; child teams appear as nested member rows | Run-history services + frontend run-history row builders | Keeps parent-owned child team runs out of top-level global history while still making them visible under the parent. |
| DS-020 | Primary End-to-End | UC-012 | Child coordinator tool call `send_message_to({ recipient_name: 'program_manager' })` resolved from scoped parent-boundary recipient descriptors | Parent recipient leaf receives backend member input and parent communication projection records nested sender | `MemberCommunicationRosterBuilder` + child `MixedTeamManager` parent-boundary bridge + parent `MixedTeamManager` | Closes the delegation/report loop without flattening the child team into the parent member list or relying on stored reply state. |
| DS-021 | Return-Event | UC-005, UC-011, UC-012 | Accepted upward parent-boundary communication | Parent Team Messages, subteam perspective, and parent recipient transcript each update once with canonical path identity | `TeamCommunicationService`, `TeamMemberInputEvent` producer, and `TeamStreamingService` | Ensures upward reports are visible where users expect them without duplicate transcript/communication rows. |
| DS-022 | Bounded Local | UC-003, UC-007, UC-012 | `send_message_to` recipient name inside any member run | Communication recipient descriptor or clear rejection | `MemberCommunicationRosterBuilder` + `MemberTeamContextBuilder` + manager recipient resolver | Prevents representative/downward/upward communication from becoming an unsafe flat organization-wide recipient list. |
| DS-023 | Bounded Local | UC-003, UC-012 | Current member context plus `communicationRecipients` descriptors and team display names | LLM prompt contains a named team membership roster manifest plus exact allowed recipient names | `MemberRunInstructionComposer` + roster-manifest renderer | Keeps LLM mental model aligned with real organization membership while preserving descriptor-owned routing. |
| DS-024 | Primary End-to-End | UC-003, UC-005, UC-007, UC-009, UC-012 | WebSocket/GraphQL team command payload | Domain call receives a `TeamMemberSelector` built only from path/route fields, or edge rejects invalid scalar alias input | Transport/GraphQL command adapters + `team-member-selector-payload-adapter` | Settles the no-legacy API contract and prevents ambiguous name/id targeting from re-entering nested command paths. |
| DS-025 | Primary End-to-End | UC-013 | Server startup after Prisma schema migrations | Required app data migrations have durable status and normal services start against current persisted data | `AppDataMigrationRunner` + `AppDataMigrationRecordRepository` | Prevents user-data upgrade failures from surfacing as broken app UI while keeping runtime code current-schema-only. |
| DS-026 | Bounded Local | UC-013 | Legacy `team_run_metadata.json` with `runVersion`/`memberMetadata[]` | Canonical `TeamRunMetadata.memberTree` file plus backup, or a recorded failed item | `TeamRunMetadataMemberTreeMigration` | Converts the known old flat schema once without adding a runtime dual parser. |
| DS-027 | Primary End-to-End | UC-013 | Settings -> Server -> Migrations opened or refreshed | User sees registered migration statuses, summaries, errors, and retry actions | `AppDataMigrationResolver` + frontend migrations store/component | Makes migration health visible to app creators and users instead of hidden startup work. |
| DS-028 | Return-Event / Degraded UX | UC-008, UC-013 | Unmigrated legacy metadata encountered during history/sidebar hydration | Normal UI skips or friendly-scopes the affected run and points diagnostics to Migrations | `TeamRunHistoryService` + migration diagnostics | Raw metadata parser exceptions must not render in the left sidebar/main app. |
| DS-029 | Primary End-to-End / Bounded Concurrency | UC-013 | Settings retry click for one migration | Retry either runs once with locked status transition and refreshed UI, or is rejected as already running | `AppDataMigrationRunner` + `AppDataMigrationRecordRepository` + GraphQL migration resolver | AC-037/AC-038 require retry execution and duplicate-run prevention, not only status display. |
| DS-030 | Primary End-to-End / Degraded UX | UC-006, UC-013 | Direct open/restore of a historical team run with unmigrated legacy metadata | No runtime starts; user gets friendly legacy-unmigrated result pointing to Migrations details/retry | `TeamRunService` + `TeamRunMetadataStore` typed diagnostics + frontend restore/open coordinator | Prevents direct restore from bypassing the history/sidebar degraded path and leaking raw parser text or guessing topology. |
| DS-031 | Primary End-to-End | UC-014 | Individual agent user send/start accepted while run is offline or idle | Backend lifecycle owner emits/snapshots canonical `initializing`, then `running`, then final idle/error/offline; frontend only renders backend status | Backend `AgentRun`/provider backend lifecycle owner + stream status snapshot/event mapper | Reintegrates personal-branch initializing UX under backend status authority and fixes `offline -> initializing -> offline/done` regression. |
| DS-032 | Primary End-to-End | UC-009, UC-014 | Team leaf or subteam/group send accepted | Backend mixed member/subteam handles emit/snapshot leaf/group/team `initializing`; resolved child coordinator transitions by route/path backend event | `MixedTeamManager` + `MixedTeamMemberHandle` + `TeamRuntimeStatusSnapshotService` + `TeamStreamingService` renderer | Makes team/nested members follow the same backend-owned startup semantics as individual agents. |
| DS-033 | Return-Event / Adapter | UC-005, UC-014 | Raw provider/runtime lifecycle status observed internally | Canonical public status payload such as `initializing` or `running` emitted to frontend | Backend provider status projectors + `normalizeAgentApiStatus` internal adapter | Keeps public status contract clean while preserving provider-edge startup semantics. |
| DS-034 | Return-Event / Read-Model Freshness | UC-008, UC-009, UC-014 | Initial WebSocket snapshot or run-history status hydration occurs around backend-accepted startup | Backend snapshot itself reports `initializing` while startup is in progress; frontend does not override backend live status with stale history rows | Backend stream snapshot owners + frontend status renderer/history merge | Separates backend status authority from frontend local pending UI and stale read-model merging. |
| DS-035 | Return-Event / Identity Routing | UC-005, UC-009, UC-014 | Team initial member status snapshot emitted for a nested member | Frontend routes backend status by `member_route_key`/`source_path`, not bare display name | Mixed member status snapshot producer + `TeamRuntimeStatusSnapshotService` + `TeamStreamingService` | Strict nested routing needs canonical identity in snapshots, not only `agent_name`/`agent_id`. |

### Use-Case-To-Spine Coverage

| Use Case | Required Spine Coverage |
| --- | --- |
| UC-001 Create/run nested mixed team | DS-001, DS-002, DS-003 |
| UC-002 User posts to subteam member | DS-004, DS-006, DS-009, DS-010 |
| UC-003 Parent agent sends to subteam representative | DS-004, DS-007, DS-009, DS-011, DS-023, DS-024 |
| UC-004 Child team coordinates internally | DS-008, DS-010 |
| UC-005 Parent stream has nested attribution | DS-010, DS-011, DS-012, DS-024 |
| UC-006 Interrupt/terminate/restore parent run | DS-013, DS-014, DS-015, DS-018, DS-019, DS-030 |
| UC-007 Reject cycles/duplicates/ambiguous targets | DS-001, DS-004, DS-012, DS-024 |
| UC-008 Display active/history recursive teams | DS-011, DS-016, DS-017, DS-019 |
| UC-009 Select/focus subteam and leaf nodes | DS-004, DS-005, DS-006, DS-016, DS-024 |
| UC-010 Configure nested launches | DS-002 |
| UC-011 Live/restored transcript, dedupe, labels | DS-005, DS-006, DS-007, DS-009, DS-015, DS-017 |
| UC-012 Child reports upward to parent boundary | DS-004, DS-020, DS-021, DS-022, DS-023, DS-024 |
| UC-013 Upgrade legacy flat team metadata safely | DS-025, DS-026, DS-027, DS-028, DS-029, DS-030 |
| UC-014 Startup status visibility for agents and nested teams | DS-031, DS-032, DS-033, DS-034, DS-035 |

## Primary Execution Spine(s)

- Topology validation spine (UC-001/UC-007): `Create run request -> TeamRunService -> TeamDefinitionTopologyPlanner -> recursive TeamRunConfig/member tree -> mixed backend selection`
- Frontend launch config spine (UC-010): `Nested team definition -> TeamMemberNode tree -> derived leaf agent nodes -> member override lookup by route key -> TeamMemberConfigInput records`
- Parent run creation spine (UC-001): `GraphQL createAgentTeamRun -> TeamRunService -> AgentTeamRunManager top-level registration -> MixedTeamRunBackendFactory -> MixedTeamManager -> initial TeamRunMetadata.memberTree`
- User-to-agent leaf spine (UC-009): `Composer -> TeamStreamingService SEND_MESSAGE(target_member_route_key leaf) -> AgentTeamStreamHandler selector adapter -> TeamRun.postMessage -> MixedAgentMemberHandle -> AgentRun.postUserMessage -> TeamMemberInputEvent/live echo`
- User-to-subteam spine (UC-002/UC-009): `Composer focused on BuildSquad -> SEND_MESSAGE(target_member_route_key BuildSquad) -> MixedSubTeamMemberHandle -> internal child TeamRun.postMessage(null/default) -> child coordinator MixedAgentMemberHandle -> AgentRun.postUserMessage -> bridged TeamMemberInputEvent`
- Parent-agent-to-subteam representative spine (UC-003): `Parent leaf send_message_to('review_lead') -> communication recipient descriptor representedSubTeam=BuildSquad -> MixedTeamManager.deliverInterAgentMessage -> parent Communication event receiver=BuildSquad/review_lead -> MixedSubTeamMemberHandle strips BuildSquad prefix -> child coordinator AgentRun input -> bridged TeamMemberInputEvent`
- Child internal coordination spine (UC-004): `Child coordinator send_message_to child leaf -> child MixedTeamManager.deliverInterAgentMessage -> child leaf handle -> child event bridge -> parent stream with prefixed sourcePath`
- Child-to-parent reporting spine (UC-012): `Child coordinator send_message_to('program_manager') -> scoped communication recipient descriptor -> child MixedTeamManager parent-boundary bridge -> parent MixedTeamManager.deliverInterAgentMessage with senderPath BuildSquad/review_lead -> parent Communication event -> program_manager AgentRun input -> MEMBER_INPUT/live transcript`
- Restore/open spine (UC-006): `getTeamRunResumeConfig/restore -> TeamRunMetadataStore canonical memberTree -> TeamRunMetadataMapper -> recursive runtime context -> MixedTeamRunBackendFactory -> lazy member handles`
- Frontend display/focus spine (UC-008/UC-009): `Backend metadata/definition memberTree -> frontend parser/topology utility -> AgentTeamContextsStore -> recursive tree rows/grid/spotlight -> focusedMemberRouteKey`
- Durable projection/open spine (UC-011): `Agent raw traces/provider projection/local projection -> AgentRunViewProjectionService merge + dedupe -> getTeamMemberRunProjection -> runProjectionConversation defensive dedupe -> leaf conversation`
- Presentation-label spine (UC-011): `TeamMemberNode + optional AgentContext -> useTeamMemberPresentation -> active/history row/header/grid labels + secondary route/definition metadata`
- Roster-manifest instruction spine (UC-003/UC-012): `MemberTeamContext.communicationRecipients + team display metadata -> TeamMembershipRosterManifest -> MemberRunInstructionComposer -> runtime instructions/tool schema -> LLM uses exact recipient_name values`
- Command API selector spine (UC-003/UC-005/UC-007/UC-009/UC-012): `WebSocket/GraphQL payload -> reject scalar target aliases or parse path/route fields -> TeamMemberSelector -> TeamRun/TeamManager command`
- App data migration startup spine (UC-013): `Server startup -> Prisma schema migrations -> AppDataMigrationRunner -> migration registry -> AppDataMigrationRecordRepository -> required migration execution -> normal services expose current-schema history`
- Legacy team metadata conversion spine (UC-013): `agent_teams/*/team_run_metadata.json -> TeamRunMetadataMemberTreeMigration -> legacy shape detection -> canonical memberTree conversion -> canonical validation -> backup -> atomic write -> DB summary/log`
- Migrations settings UI spine (UC-013): `Settings -> Server -> Migrations -> frontend appDataMigrationsStore -> GraphQL getAppDataMigrations -> DB records + registry definitions -> status table/details/retry`
- Manual migration retry/concurrency spine (UC-013): `Settings retry click -> appDataMigrationsStore.runMigration(id) -> GraphQL runAppDataMigration(id) -> AppDataMigrationRunner acquire per-migration lock -> resolve stale RUNNING or reject live duplicate -> AppDataMigrationRecordRepository RUNNING transition -> migration execute/skip/fail -> DB summary/log -> GraphQL result -> status refresh -> Settings UI`
- Direct legacy restore degraded spine (UC-006/UC-013): `User opens/restores historical team run -> frontend run-open/restore coordinator -> GraphQL restore/open request -> TeamRunService -> TeamRunMetadataStore typed legacy-unmigrated diagnostic -> no runtime start/no topology guessing -> friendly operation result/toast/dialog -> link to Settings -> Server -> Migrations details/retry`
- Individual backend-owned startup status spine (UC-014): `User clicks Run/send -> frontend records local pending submit only -> GraphQL/WebSocket command -> backend AgentRun/provider backend accepts work and sets lifecycle status initializing -> AGENT_STATUS snapshot/event -> frontend renders initializing -> backend runtime activity emits running -> completion/error/termination settles status`
- Team/nested backend-owned startup status spine (UC-009/UC-014): `Focused leaf or subteam send -> frontend records local pending submit only and sends route/path selector -> MixedTeamManager/member handle accepts work and sets leaf/group/team lifecycle status initializing -> route/path status snapshot/event -> TeamStreamingService renders exact member/group/team -> child coordinator running/terminal events settle status`
- Provider canonical status projection spine (UC-014): `Provider backend raw lifecycle state -> provider-specific status projector/internal normalizer -> canonical AgentStatusPayload -> WebSocket/GraphQL/frontend status handler`
- Team status snapshot identity spine (UC-005/UC-014): `MixedTeamManager.getMemberStatusSnapshots -> include member_route_key/source_path -> TeamRuntimeStatusSnapshotService -> AGENT_STATUS snapshot -> TeamStreamingService route by canonical identity -> member status state`

## Return Or Event Spine(s) (High-Level)

- Member input event spine (Round 5 blocker): `Accepted target leaf input -> TeamRunEventSourceType.MEMBER_INPUT with sourcePath = recipient leaf -> WebSocket EXTERNAL_USER_MESSAGE payload -> TeamStreamingService route by source_path/member_route_key -> upsert user message by message_id/dedupe_key`
- Agent output event spine: `AgentRun event -> MixedAgentMemberHandle -> publishProcessedTeamAgentEvents -> TeamRunEventSourceType.AGENT with sourcePath -> WebSocket -> TeamStreamingService -> leaf AgentContext`
- Child event bridge spine: `Child TeamRun event -> MixedSubTeamMemberHandle prefix sourcePath -> parent TeamRun subscribers -> WebSocket/projection consumers`
- Team communication event spine: `MixedTeamManager communication payload -> TeamCommunicationService projection -> WebSocket TEAM_COMMUNICATION_MESSAGE -> TeamCommunicationStore participant-aware upsert`
- Upward reporting event spine: `Child parent-boundary delivery -> parent Communication payload with nested sender sourcePath -> TeamCommunicationStore perspectives -> parent recipient MEMBER_INPUT -> TeamStreamingService program_manager conversation upsert`
- Metadata refresh spine: `TeamRun event/status change -> debounced TeamRunService.refreshRunMetadata -> TeamRunMetadataMapper -> TeamRunMetadataStore.writeMetadata(memberTree)`
- Migration failure/status spine: `Migration item failure -> AppDataMigrationRunner aggregates result -> AppDataMigrationRecordRepository writes FAILED/SUCCEEDED_WITH_WARNINGS -> GraphQL status -> Settings Migrations view -> user retry or inspect logs`
- Legacy history degradation spine: `TeamRunHistoryService reads legacy-unmigrated metadata -> typed diagnostic -> skip/friendly unavailable run row -> no raw parser text in left sidebar -> Migrations view owns detailed error`
- Migration retry completion spine: `Manual retry result -> AppDataMigrationRecordRepository writes SUCCEEDED/FAILED/SUCCEEDED_WITH_WARNINGS -> GraphQL mutation response -> appDataMigrationsStore refreshes list -> Settings row updates status/details/retry availability`
- Direct restore degraded return spine: `TeamRunService legacy-unmigrated result -> GraphQL restore/open payload with friendly code/message -> frontend restore/open coordinator prevents workspace activation -> user sees actionable message and Migrations navigation`
- Backend startup snapshot return spine: `Backend accepted startup -> backend status snapshot returns initializing -> WebSocket/status event carries canonical status -> frontend status renderer applies backend status; stale history refresh cannot replace newer live backend status`
- Provider status projection return spine: `Provider lifecycle token -> backend internal projector -> canonical public status -> frontend receives only canonical status`
- Team member status snapshot return spine: `TeamRun member status snapshot with source path/route key -> frontend stream router -> exact leaf/group status update`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A create-run request enters with a root definition. The planner loads all referenced teams, validates graph constraints, assigns member paths/route keys, validates coordinator/duplicate identity rules, and outputs the recursive executable topology. | Definition graph, topology planner, recursive config tree | `TeamDefinitionTopologyPlanner` | Definition service lookup, cycle detector, route-key normalization |
| DS-002 | The frontend mirrors the recursive definition tree for draft/config UI, derives only leaf agents for runtime overrides, and sends canonical route-keyed member configs. | `TeamMemberNode`, override map, launch config records | Frontend topology utility + config builder | Agent definition lookup, runtime/model catalog validation |
| DS-003 | Backend create-run receives route-keyed leaf configs, chooses mixed for nested topology, registers only the parent team run globally, creates a mixed runtime context, and seeds recursive metadata. | TeamRunService, top-level TeamRun, Mixed backend | `TeamRunService` | History index, workspace normalization, metadata mapper |
| DS-004 | All external command target payloads either provide explicit path/route identity and become a path/route `TeamMemberSelector`, or are rejected at the edge before domain/backend code. Bare names and agent id/name aliases are never command selectors. | Transport payload, selector adapter, `TeamRun` command | Transport adapter + `TeamMemberSelector` helpers | Invalid-target errors, GraphQL/WebSocket shape mapping |
| DS-005 | Direct leaf user sends post to the selected leaf handle. The frontend may optimistically show the user message, but the accepted backend member-input event is the canonical live confirmation and dedupe source. | Leaf selector, MixedAgentMemberHandle, AgentRun | `MixedTeamManager`/`MixedAgentMemberHandle` | Client message IDs, optimistic message upsert |
| DS-006 | Subteam user sends resolve to a parent subteam handle. The child team chooses its default/coordinator target and publishes the actual recipient leaf input event back through the parent bridge. | Subteam handle, child TeamRun, child coordinator handle | `MixedSubTeamMemberHandle` + child `MixedTeamManager` | Child default target resolution, event prefixing |
| DS-007 | Parent agent communication targets a communication-visible subteam representative such as `review_lead`; the descriptor carries represented `BuildSquad` identity and routes through the subteam handle to the child coordinator. The parent communication row and child transcript input are linked but not the same projection row. | Communication recipient descriptor, delivery request, communication payload, child input | `MemberCommunicationRosterBuilder` + `MixedTeamManager.deliverInterAgentMessage` | Delivery trace IDs, reference files, sender/receiver participant mapping, represented-subteam metadata |
| DS-008 | Inside a child team, `send_message_to` uses the child manager's own members and selectors. Parent code only sees the bridged result with prefixed `sourcePath`. | Child member context, child manager, child leaf handles | Child `MixedTeamManager` | Child communication projection, parent event bridge |
| DS-009 | Every backend-delivered recipient input that the live UI must display emits a member-routed input event. The frontend routes by recipient path and upserts by message identity, never deriving child prompts from team communication messages. | Member input payload, WebSocket external-user message, leaf conversation | Backend member-input producer + `TeamStreamingService` | Payload mapping, duplicate optimistic/live merge |
| DS-010 | Agent runtime output is published as agent events with canonical source path. Child events are prefixed before reaching parent clients. | AgentRun event, TeamRunEvent, WebSocket message | `MixedAgentMemberHandle` / event bridge | Event pipeline processors, transport aliases |
| DS-011 | Parent-level team communication is stored and rendered as participant-aware communication, including actual representative participants plus represented-subteam metadata. It does not impersonate a structural `agent_team` node as an agent run. | Communication event, projection row, frontend message | `TeamCommunicationService` + `TeamCommunicationStore` | Reference files, perspective/grouping logic, represented-subteam fields |
| DS-012 | Tool approval request events carry route/path identity from the requesting leaf. Approval commands round-trip that identity into selectors and reject subteam targets plus every scalar/bare-name or agent-id/name target alias. | Tool lifecycle event, approval token, selector command | Stream handler + `MixedTeamManager` | Approval token serialization, frontend target cache |
| DS-013 | Recursive metadata is refreshed from runtime context and stored as the parent run's canonical `memberTree`. Runtime readers reject/diagnose legacy flat metadata rather than converting it inline. | Runtime context, metadata mapper, metadata store | `TeamRunMetadataMapper` + `TeamRunMetadataStore` | Debounce timers, history summaries, derived flattener, migration diagnostics |
| DS-014 | Restore reconstructs the same recursive topology and lazy handle contexts from canonical metadata. Child team run IDs remain inside parent member metadata. | Resume config, recursive runtime context, backend factory | `TeamRunService` + `MixedTeamRunBackendFactory` | Workspace root resolution, platform IDs |
| DS-015 | Durable projection reads local and provider projections, merges them semantically, removes null-timestamp duplicates, and returns one logical conversation for a leaf route key. Frontend hydration defensively dedupes again. | Projection sources, dedupe normalizer, conversation hydration | `AgentRunViewProjectionService` | Provider-specific projection differences, sort stability |
| DS-016 | The frontend state owner keeps recursive `memberTree` plus indexes. UI modes render the tree/group/leaf shape from this state instead of flattening. | `AgentTeamContext`, row/tree/grid/spotlight views | `AgentTeamContextsStore` | Expand/collapse state, status summaries |
| DS-017 | Presentation policy uses team membership labels as primary identity everywhere and treats route breadcrumbs/agent definition names as secondary metadata. | TeamMemberNode, AgentContext, display rows | `useTeamMemberPresentation` | Avatar lookup, tooltip/subtitle formatting |
| DS-018 | Parent lifecycle commands iterate active member handles and cascade to child teams, then clear subscriptions and contexts. | Mixed manager, handles, child TeamRun | `MixedTeamManager` | Error aggregation, cleanup ordering |
| DS-019 | History read models project one parent run with recursive member rows. Child internal team runs are nested rows, not global top-level history records. | History index, TeamTreeNode, member rows | Run-history services + frontend row builders | Workspace grouping, active/historical merge |
| DS-020 | A child coordinator sends a report to a parent-boundary recipient by direct visible member name. The child manager resolves the recipient against scoped communication recipients, bridges the request to the parent manager, and the parent delivers to its own member handle. | Child sender, communication recipient descriptor, parent-boundary bridge, parent recipient handle | `MemberCommunicationRosterBuilder` + child `MixedTeamManager` + parent `MixedTeamManager` | Communication recipient descriptors, nested sender normalization |
| DS-021 | The accepted upward report updates parent Team Messages, subteam communication perspective, and the parent recipient transcript exactly once. Communication and transcript rows are linked but not conflated. | Parent communication row, subteam perspective row, parent member input | `TeamCommunicationService` + member input event producer | Delivery trace IDs, frontend perspective filtering |
| DS-022 | A `send_message_to` argument is resolved against the current member's scoped communication roster: local teammates, subteam representatives, or parent-boundary recipients as applicable. Non-exposed or ambiguous targets fail before delivery. | Tool recipient name, communication recipient descriptor, selector | `MemberCommunicationRosterBuilder` + `MemberTeamContextBuilder` + manager recipient resolver | Visible-name uniqueness, instruction/schema enum generation |
| DS-023 | The instruction composer turns scoped descriptors into an organization-style team membership manifest. It groups rows by human team name and role, marks the current member, shows represented subteam context, and separately lists exact allowed `recipient_name` values. | Member context, descriptors, team display metadata, prompt text | `MemberRunInstructionComposer` + roster-manifest renderer | Prompt formatting, recipient enum text, localization-safe wording |
| DS-024 | Command edge adapters parse only explicit path/route target fields. If a payload supplies scalar alias target fields, the edge returns invalid-target before any domain/backend call. | WebSocket/GraphQL payload, selector adapter, domain command | Transport/GraphQL command adapters + `team-member-selector-payload-adapter` | Error payload wording, tests/E2E helper payload shape |
| DS-025 | Server startup runs Prisma/database schema migrations first, then executes registered required app data migrations before normal services expose run-history data. The runner records every attempt and keeps runtime readers current-schema-only. | Startup sequence, migration registry, migration runner, migration record | `AppDataMigrationRunner` | Startup ordering, stale running recovery, failure policy, normal service gating |
| DS-026 | The concrete team-run metadata migration scans existing team metadata files, detects known flat legacy payloads, converts them to canonical one-level `memberTree`, validates output, backs up originals, writes atomically, and records per-file results. | Legacy metadata file, converter, canonical validator, backup/write result | `TeamRunMetadataMemberTreeMigration` | File scanning, backup naming, atomic write, item detail aggregation |
| DS-027 | The Settings migration screen lists registry-defined migrations merged with database records so users can see not-run/running/succeeded/failed states, summaries, details, and retry availability without reading logs. | Settings UI, frontend migration store, GraphQL status query, migration records | `ServerMigrationsManager` + `appDataMigrationsStore` + GraphQL migration resolver | Status DTO mapping, friendly/technical detail split, refresh state |
| DS-028 | History/sidebar hydration catches typed legacy-unmigrated metadata diagnostics, avoids raw parser errors, skips or friendly-scopes affected historical runs, and points details to the migration screen. | History query, metadata diagnostic, history read model, sidebar row | `TeamRunHistoryService` + frontend history/read-model owners | Friendly unavailable row text, logging, migration-detail link |
| DS-029 | Manual retry starts from the Settings retry button and flows through the frontend store and GraphQL mutation into the runner. The runner handles stale `RUNNING`, rejects true concurrent duplicate runs, transitions status through `RUNNING`, executes the migration idempotently, records summary/logs, and returns a refreshed status. | Retry action, GraphQL mutation, runner lock, migration record, migration execution | `AppDataMigrationRunner` + GraphQL migration resolver + `appDataMigrationsStore` | Per-migration locking, stale-running timeout, duplicate-run error, idempotent skip of already-current files |
| DS-030 | Direct open/restore of an unmigrated legacy team run uses the same typed metadata diagnostic as history, but returns a controlled operation result: no runtime starts, no topology is guessed, and the frontend shows a friendly message with navigation to Settings -> Server -> Migrations. | Restore/open request, metadata diagnostic, operation result, frontend restore/open coordinator | `TeamRunService` + GraphQL team-run restore/open resolver + frontend run-open/restore coordinator | Error code mapping, toast/dialog copy, migration detail routing |
| DS-031 | A user send/start enters the backend while an individual run is offline/idle. The backend lifecycle owner records canonical `initializing` before accepted operation acknowledgment/snapshot, then emits `running` and terminal/idle states as runtime work progresses. Frontend local submission state is separate and does not mutate canonical status. | Backend run lifecycle state, status snapshot, live status event, frontend renderer | Backend `AgentRun`/provider backend lifecycle owner + stream handler | Local pending UI, optimistic message row, completion cleanup |
| DS-032 | A team leaf or subteam/group send uses the same backend-owned invariant. The mixed member/subteam handle records canonical `initializing` for the accepted member/group/team boundary, then route/path backend events update the resolved child coordinator leaf and aggregate team. Frontend renders those backend statuses without focus-based inference. | Mixed member lifecycle state, group/team aggregate status, child coordinator leaf, frontend renderer | `MixedTeamManager` + `MixedTeamMemberHandle` + `TeamStreamingService` | Group status summary, child coordinator resolution, terminal cleanup |
| DS-033 | Provider backends may observe raw lifecycle states, but the backend projector/adaptor converts them to canonical public statuses before any WebSocket/GraphQL/frontend payload. This is not public alias compatibility; it is provider-edge translation. | Provider status token, canonical AgentStatusPayload | Provider-specific status projectors + internal status normalizer | Provider runtime quirks, docs alignment |
| DS-034 | Initial WebSocket snapshots are backend truth and must report `initializing` while backend startup is in progress. Run-history hydration is a stale read model and must not overwrite newer live backend status. Frontend keeps pending-submit UI separate from canonical runtime status. | Backend snapshot payload, live status state, history read model, frontend renderer | Backend stream snapshot owners + frontend history/live merge owner | Snapshot metadata, hydration ordering, completion cleanup |
| DS-035 | Team member status snapshots include canonical route/path identity so the frontend can dispatch them through strict nested routing. `agent_name` and `agent_id` are not routing authority for nested status updates. | Member status snapshot, source path/route key, frontend member context | Mixed snapshot producer + `TeamRuntimeStatusSnapshotService` + `TeamStreamingService` | Child route derivation, snapshot DTO typing |

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
- `TeamRunMemberInputEventPayload` / member input event producer
- `MemberCommunicationRosterBuilder` / `MemberTeamRecipientDescriptor` communication-recipient model
- `ParentBoundaryBridge` for child-to-parent reporting
- `AgentTeamStreamHandler` transport command/event mapper
- `TeamCommunicationService`
- `TeamRunMetadataMapper`
- `AgentRunViewProjectionService` / run projection dedupe normalizer
- Frontend `TeamMemberNode` tree / member-node indexes
- Frontend `AgentTeamContextsStore`
- Frontend `TeamStreamingService` and `TeamCommunicationStore`
- Frontend `runProjectionConversation` hydration
- Frontend `useTeamMemberPresentation`
- `AppDataMigrationRunner`
- `AppDataMigrationRegistry` / migration definition list
- `AppDataMigrationRecordRepository`
- `TeamRunMetadataMemberTreeMigration`
- GraphQL `AppDataMigrationResolver` / migration status and retry DTOs
- Frontend `appDataMigrationsStore`
- Frontend `ServerMigrationsManager`
- Team-run restore/open degraded-result owner (`TeamRunService` + GraphQL restore/open resolver + frontend run-open/restore coordinator)
- Backend runtime lifecycle status owner (`AgentRun`/provider backends, `MixedTeamManager`, mixed member/subteam handles)
- Backend provider status projection owner (`agent-status-payload.ts` plus provider-specific projectors)
- WebSocket status snapshot owners (`AgentStreamHandler`, `TeamRuntimeStatusSnapshotService`)
- Frontend runtime status renderer/local submission UI owner (`agentRuntimeStatusState`, single-agent/team run stores, run-history live merge)

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
| `ParentBoundaryBridge` | Scoped upward delivery from an internal child run back into the parent mixed manager without global run lookup. |
| `MemberCommunicationRosterBuilder` / `MemberTeamRecipientDescriptor` / `MemberTeamContextBuilder` | Local, subteam-representative, and parent-boundary recipient exposure, tool recipient names, selector/target-team-run identity, representation metadata, grouping metadata, and ambiguity rejection. |
| `TeamMembershipRosterManifest` / `MemberRunInstructionComposer` | LLM-facing organization roster presentation: named team contexts, current member role/self row, messageable rows, and exact allowed recipient list. |
| `TeamRunMemberInputEventPayload` / member input producer | Canonical backend event for accepted recipient-side inputs that must appear in live leaf transcripts. |
| `AgentTeamStreamHandler` | Edge adapter for WebSocket command selectors and team-event-to-transport payload mapping, including `MEMBER_INPUT -> EXTERNAL_USER_MESSAGE`. |
| `TeamCommunicationService` | Backend participant-aware communication projection for parent-level member communication, including actual subteam representative participants and represented-subteam metadata. |
| `TeamRunMetadataMapper` | Recursive team-run metadata projection and restore context construction. |
| `AgentRunViewProjectionService` / projection dedupe normalizer | Semantic projection merge/dedupe across local/provider/fallback projection sources before GraphQL responses. |
| Frontend topology utilities | Convert nested definitions and recursive metadata into `TeamMemberNode` trees and derived leaf-agent lists. |
| `AgentTeamContextsStore` | Active frontend team context, recursive member tree, member selection/focus, and derived leaf agent context indexes. |
| `TeamStreamingService` | Frontend stream event dispatch by canonical source path/route identity. |
| `TeamCommunicationStore` | Frontend communication projection with sender/receiver member kind/path/route. |
| `runProjectionConversation` | Frontend conversion from projection rows to `Conversation`, including defensive dedupe of stale duplicate rows. |
| `useTeamMemberPresentation` | Single frontend presentation policy for primary labels, route breadcrumbs, definition subtitles, and initials/avatar lookup. |
| `AppDataMigrationRegistry` | Registered migration definitions, IDs, display metadata, required/startup policy, and concrete migration binding. |
| `AppDataMigrationRunner` | Pending/startup/manual migration execution, per-migration concurrency lock, stale `RUNNING` handling, status transitions, result aggregation, and retry semantics. |
| `AppDataMigrationRecordRepository` | Durable database records for migration status, attempts, timestamps, summary JSON, error message, and log path. |
| `TeamRunMetadataMemberTreeMigration` | The only owner of legacy flat team metadata conversion to canonical `memberTree`; file scanning, conversion, validation, backup, atomic write, and per-item details. |
| GraphQL `AppDataMigrationResolver` | Migration status query and retry mutation boundary; maps runner/repository state to frontend-safe DTOs and rejects duplicate-run attempts clearly. |
| Frontend `appDataMigrationsStore` | Migration Settings state, status refresh, retry action execution, loading/error state, and post-retry refresh. |
| `ServerMigrationsManager` | User-facing Settings -> Server -> Migrations table, friendly status/errors, technical detail expansion, refresh, and retry controls. |
| Direct restore/open degraded-result owner | `TeamRunService` and GraphQL restore/open resolver convert typed legacy-unmigrated metadata diagnostics into a controlled operation result; frontend run-open/restore coordinator prevents workspace activation and shows friendly migration guidance. |
| Backend runtime lifecycle status owner | Canonical runtime status transitions for individual runs, mixed leaf members, subteam/group handles, aggregate team status, running/terminal settlement, and `getStatusSnapshot()` correctness. |
| Backend provider status projection owner | Internal raw provider lifecycle token mapping into canonical public status payloads; ensures provider-specific startup states become `initializing` before publication without widening public command/status APIs. |
| WebSocket status snapshot owners | Status snapshot emission for agent/team streams, including canonical current backend status and canonical member route/path identity for team member snapshots. |
| Frontend runtime status renderer/local submission UI owner | Renders backend canonical statuses, owns separate pending-submit/disabled-control/optimistic-message UI state, and prevents stale history read models from replacing newer live backend status. |

If `MixedTeamRunBackend` remains a public runtime facade, it is a thin entry wrapper; `MixedTeamManager` is the governing owner behind it.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `MixedTeamRunBackend` | `MixedTeamManager` | Adapts common `TeamRunBackend` API to mixed manager commands. | Member handle creation, routing policy, event bridging. |
| GraphQL `createAgentTeamRun` mutation | `TeamRunService` | Transport entrypoint. | Topology planning or backend selection. |
| GraphQL `getAppDataMigrations` query | `AppDataMigrationRecordRepository` + `AppDataMigrationRegistry` | Settings status entrypoint. | Migration execution or filesystem access. |
| GraphQL `runAppDataMigration(id)` mutation | `AppDataMigrationRunner` | Settings retry/run entrypoint. | Locking, stale-running resolution, conversion, or DB status policy. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Flat-only mixed member assumption (`MixedTeamManager.memberRuns`, `ensureMemberReady(): AgentRun`) | Cannot represent subteam members. | `MixedTeamMemberRegistry` + `MixedTeamMemberHandle` member handles. | In This Change | Rename/remove agent-only maps. |
| Flat launch traversal as execution topology (`collectLeafAgentMembers` used as run plan) | Loses subteam boundaries. | `TeamDefinitionTopologyPlanner`. | In This Change | A leaf collector can remain only as a view/helper if not authoritative. |
| Agent-only `TeamMemberRunConfig` as universal member shape | Forces subteams into invalid agent fields. | Discriminated `TeamRunMemberConfig` union. | In This Change | Update consumers to narrow by `memberKind`. |
| Agent-only `MixedTeamMemberContext` | Cannot persist child team IDs/context. | `MixedAgentMemberContext` + `MixedSubTeamMemberContext`. | In This Change | Common base includes path/route identity. |
| Flat `TeamRunMemberMetadata` as authoritative restore schema | Cannot restore topology. | Canonical recursive `TeamRunMetadata` with a `memberTree`. | In This Change | Do not introduce a version-suffixed metadata type or `runVersion`; normal restore reads only current schema. Known old flat files are upgraded by app data migration, not runtime fallback. |
| `subTeamNodeName` as the only nested event identity | Ambiguous for deep nesting. | Canonical `sourcePath` on `TeamRunEvent`. | In This Change | WebSocket/GraphQL mappers may derive legacy/display aliases from `sourcePath`; old single-name field must not remain domain source of truth. |
| `INTER_AGENT_MESSAGE` as the canonical mixed recipient transcript event | It carries original communication content and agent-shaped fields, not the actual recipient-visible user prompt or child leaf route. | `TeamRunEventSourceType.MEMBER_INPUT` mapped to `EXTERNAL_USER_MESSAGE` for leaf transcripts, plus `COMMUNICATION` for parent team messages. | In This Change | Existing legacy/non-mixed handling can remain only if it does not own mixed nested communication or duplicate transcript rows. |
| Exact JSON row merge for run projections | Cannot dedupe the same logical message when one source has a timestamp and another has `ts: null`. | Semantic projection dedupe normalizer under run-history projection. | In This Change | GraphQL must return deduped rows; frontend dedupe is defensive only. |
| Frontend flat-only active team display (`resolveLeafTeamMembers` -> `members` map as UI topology) | Omits subteam nodes such as `BuildSquad`. | Recursive `TeamMemberNode` tree with derived leaf indexes. | In This Change | This is the validation-blocking UI failure. |
| Frontend flat metadata schema (`runVersion` + `memberMetadata`) as current restore type | Conflicts with canonical backend `memberTree`. | Recursive frontend metadata parser/types. | In This Change | No frontend compatibility parser for old flat schema. |
| Raw unsupported legacy metadata errors in normal app UI | Makes existing installations look broken after upgrade. | App data migration status plus controlled history degradation/friendly diagnostics. | In This Change | Settings -> Server -> Migrations owns detailed technical errors and retry. |
| Flat `allowedRecipientNames` as the authoritative communication model | Cannot distinguish local teammates, subteam representatives, and parent-boundary report recipients and would flatten hierarchy. | `communicationRecipients: MemberTeamRecipientDescriptor[]` with derived `allowedRecipientNames` for tool schema only. | In This Change | Do not append parent recipients to `members` as fake local teammates. |
| Technical routing-scope labels as LLM roster headings | The LLM needs a real organization manifest, not internal labels like `local_agent` or `parent_boundary_agent`. | Team membership roster manifest grouped by team names and roles, with exact allowed recipient names. | In This Change | Scope names stay internal descriptor metadata only. |
| Scalar command target aliases | They keep ambiguous bare-name routing alive at the API edge and conflict with the no-legacy policy. | Explicit path/route selector fields for command input. | In This Change | Remove `target_member_name`, `target_agent_name`, command-side `agent_name`, command-side `agent_id`, and camelCase equivalents as accepted command targets. |
| Component-local primary label choices such as preferring `agentDefinitionName` in one view and `memberName` in another | Causes active/history nested row identity drift. | `useTeamMemberPresentation` primary/secondary label policy. | In This Change | Agent definition name stays secondary metadata, not the primary row label. |
| Frontend-authored canonical `initializing` (`applyAcceptedStartupStatus` / `applyAcceptedTeamMemberStartupStatus` mutating `currentStatus`) | Creates two authorities for the same runtime status field and causes `offline -> initializing -> offline` races when backend snapshots disagree. | Backend runtime lifecycle owner emits/snapshots canonical `initializing`; frontend keeps only local pending-submit UI. | In This Change | Remove or repurpose these helpers so they do not write canonical runtime status. |
| Backend missing startup lifecycle snapshot/state | If backend accepts startup but snapshots `offline`/`idle`, frontend cannot be a passive renderer and the UI regresses. | Backend run/member lifecycle status state and `getStatusSnapshot()` returning `initializing` while startup is in progress. | In This Change | Initial stream snapshots are backend truth; make them correct rather than guarded by frontend canonical overrides. |
| Global removal of provider startup-token projection | Confuses clean public API with internal provider adaptation and removes canonical `initializing` from provider startup states. | Provider-edge status projectors/internal normalizer emitting canonical statuses. | In This Change | Do not reintroduce raw provider tokens as public frontend statuses. |
| Team member status snapshots without canonical route/path identity | Strict nested frontend routing cannot reliably attach initial status to the right member. | Snapshot payloads with `member_route_key`/`source_path`. | In This Change | `agent_name`/`agent_id` remain non-authoritative metadata only and must not be the nested status-routing contract. |

## Return Or Event Spine(s) (If Applicable)

- Recipient input event: `AgentInputUserMessage accepted by a resolved leaf handle -> TeamRunEventSourceType.MEMBER_INPUT with sourcePath = recipient leaf -> AgentTeamStreamHandler maps to EXTERNAL_USER_MESSAGE -> TeamStreamingService upserts user message in leaf conversation`
- Top-level agent event: `AgentRun event -> MixedAgentMemberHandle -> MixedTeamManager.publish(event with sourcePath [memberName]) -> TeamRun subscribers/WebSocket`
- Subteam child event: `Child TeamRun event -> MixedSubTeamMemberHandle event bridge -> parent MixedTeamManager.publish(event with sourcePath [subteamName, ...childSourcePath]) -> TeamRun subscribers/WebSocket`
- Parent communication event: `MixedTeamManager.deliverInterAgentMessage -> TeamRunEventSourceType.COMMUNICATION with sender/receiver participants -> TeamCommunicationService projection -> WebSocket TEAM_COMMUNICATION_MESSAGE -> TeamCommunicationStore`
- Upward parent-boundary report event: `Child MixedTeamManager parent-boundary bridge -> parent MixedTeamManager.deliverInterAgentMessage -> COMMUNICATION with nested sender sourcePath -> parent recipient MEMBER_INPUT -> frontend TeamCommunicationStore and leaf transcript`
- Durable projection return path: `local/provider projection sources -> semantic dedupe normalizer -> getTeamMemberRunProjection -> frontend projection hydration defensive dedupe -> leaf conversation`
- Status event: `member status changes -> MixedTeamManager.deriveTeamStatus() -> TeamRunEventSourceType.TEAM status event`

## Bounded Local / Internal Spines (If Applicable)

Parent owner: `MixedTeamManager`

`Member command -> ensure handle ready -> execute handle command -> update runtime context -> derive status -> publish status if changed`

This bounded local spine is important because both agent and subteam handles must obey identical lifecycle sequencing.

Parent owner: child `MixedTeamManager` recipient resolver

`send_message_to recipient -> match local allowed recipient -> otherwise match parent-boundary bridge recipient -> normalize target team run/selector -> reject if no scoped match`

This bounded local spine is important because upward reporting must be possible without flattening all parent members into the child team.

Parent owner: `MixedSubTeamMemberHandle`

`Child TeamRun subscribe -> receive child event -> prefix sourcePath -> parent publish -> update child run ID/status`

This is the child-team event bridge analogous to AutoByteus-ts `TeamEventBridge`.

Parent owner: `AgentRunViewProjectionService`

`Read local projection -> read primary provider projection -> read optional fallback projection -> semantic dedupe conversation/activity rows -> build projection bundle`

This local spine is important because exact raw JSON merge creates timestamp/null duplicate rows for the same child coordinator messages.

Parent owner: frontend `TeamStreamingService`

`Receive WebSocket message -> resolve route by source_path/member_route_key -> dispatch to leaf AgentContext or team communication store -> upsert by message identity`

This local spine prevents nested live events from falling back to whichever member is currently focused.

Parent owner: `AppDataMigrationRunner`

`Run request -> load registry definition -> acquire per-migration lock -> normalize stale RUNNING record -> transition to RUNNING -> execute migration -> aggregate item results -> write SUCCEEDED/FAILED/SUCCEEDED_WITH_WARNINGS -> release lock`

This local spine is important because startup and manual retry use the same concurrency/idempotency policy.

Parent owner: frontend run-open/restore coordinator

`Restore/open result -> if legacy-unmigrated code -> do not activate workspace/run -> show friendly migration message -> offer Settings -> Server -> Migrations navigation`

This local spine prevents direct restore/open from leaking backend parser errors or partially activating an invalid runtime.

Parent owner: backend runtime lifecycle status owner

`Accepted send/start -> record backend lifecycle status initializing -> publish/snapshot canonical status -> runtime activity changes to running -> completion/error/termination settles backend status`

This local spine makes backend the source of truth for initialization instead of relying on frontend optimistic canonical status writes.

Parent owner: frontend runtime status renderer/local submission UI owner

`User submits -> set local pending UI/optimistic message only -> receive backend status snapshot/event -> render canonical backend status -> stale history rows cannot replace newer live backend status -> completion clears pending UI`

This local spine keeps UX responsiveness without duplicating canonical runtime status ownership.

Parent owner: backend provider status projector

`Provider raw status token -> provider/runtime-specific mapper -> canonical status payload -> stream/projection emission`

This local spine keeps provider compatibility inside adapters while preserving a clean canonical public status contract.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Definition lookup | DS-001 | Topology planner | Load root/child definitions. | Planner should not know persistence internals. | Manager would perform late runtime lookups and fail after partial startup. |
| Launch config matching | DS-001 | Topology planner | Match user/preset launch settings to leaf agents by path/route key. | Keeps execution config complete before backend creation. | Runtime would discover missing model/workspace settings too late. |
| Workspace normalization | DS-001 | TeamRunService | Resolve workspace IDs/root paths for leaf agents. | Existing service already owns workspace setup. | Topology planner would mix graph planning with workspace persistence. |
| Event pipeline | DS-010 | Member handle/event bridge | Normalize agent events before parent publication. | Existing event projection expects processed events. | Raw provider events leak to parent consumers. |
| Metadata projection | DS-004 | TeamRunMetadataMapper | Recursive runtime/context <-> durable metadata. | Restore needs one owner for schema. | Runtime manager would own persistence mapping. |
| Migration record persistence | DS-025, DS-027, DS-029 | `AppDataMigrationRunner` / GraphQL migration resolver | Persist migration status, attempts, timestamps, summary JSON, error message, and log path. | Runner and UI need durable shared truth. | Status would be inferred from logs/files and become unreliable. |
| Migration registry lookup | DS-025, DS-027, DS-029 | `AppDataMigrationRunner` / GraphQL status resolver | Merge code-defined migration definitions with DB records, including not-run migrations. | Settings must show migrations before first run. | UI would only show previously-run records and hide pending work. |
| Migration friendly diagnostics | DS-028, DS-030 | `TeamRunHistoryService` / restore-open result mapper | Convert typed legacy-unmigrated diagnostics into skip/friendly unavailable messages. | Keeps raw parser text out of normal UI. | Sidebar/direct restore would look broken. |
| WebSocket mapping | DS-009, DS-010, DS-011 | AgentTeamStreamHandler | Convert `TeamRunEvent` to client messages. | Transport-specific shaping. | Mixed manager would become transport-aware. |
| Member input event mapping | DS-005, DS-006, DS-007, DS-009 | Leaf member handle / stream handler | Publish accepted recipient inputs as `MEMBER_INPUT` and map them to live `EXTERNAL_USER_MESSAGE` payloads. | Live transcript must show the actual receiving leaf input. | Frontend would guess child coordinator from parent communication. |
| Delivery trace identity | DS-007, DS-009, DS-015 | Mixed delivery and projection owners | Link parent communication message, recipient input event, and projection row IDs. | Prevents conflating or duplicating related records. | Rows would be deduped only by brittle content guesses. |
| Communication roster recipient exposure | DS-007, DS-020, DS-022 | `MemberCommunicationRosterBuilder`, `MemberTeamContextBuilder`, parent/child `MixedTeamManager` | Expose scoped local recipients, subteam representatives, and upward parent-boundary recipients with target team-run/path/route identity. | Child agents need a report-back channel without global peer flattening. | Parent members would be appended as fake local teammates or become unreachable. |
| Nested sender participant normalization | DS-020, DS-021 | Parent `MixedTeamManager` communication payload builder | Use request sender path/route when the sender is a child leaf not present as a parent top-level context. | Upward reports must show `BuildSquad/review_lead`, not an empty/unknown sender. | Parent communication projections would lose nested sender identity. |
| Projection dedupe | DS-015 | AgentRunViewProjectionService | Semantically merge local/provider projection rows and remove timestamp/null duplicates. | Current exact JSON merge is too weak. | Components would hide duplicates differently and GraphQL would remain wrong. |
| Frontend tree projection | DS-006 | `AgentTeamContextsStore` | Build display tree and leaf indexes from definition/metadata. | UI needs both recursive display and leaf conversation lookup. | Components would each flatten or guess topology differently. |
| Frontend event identity mapping | DS-007 | `TeamStreamingService` | Resolve source path/route to member node or leaf context. | Streaming payloads carry transport aliases plus canonical identity. | Activity would attach to focused or wrong flat member. |
| Frontend projection hydration defense | DS-015 | `runProjectionConversation` | Defensively dedupe stale projection payloads before building `Conversation`. | Backend owns dedupe but UI should be robust to stale rows. | Opened runs could still duplicate messages from cached/old responses. |
| Frontend member presentation | DS-017 | `useTeamMemberPresentation` | Compute primary membership label and secondary route/definition metadata consistently. | Active/history rows need one identity policy. | Each row/component would choose different names. |
| Backend startup lifecycle state | DS-031, DS-032, DS-034 | Backend runtime lifecycle status owner | Record accepted startup as canonical `initializing` and expose it through snapshots/events until running or terminal settlement. | Prevents `initializing` flicker/regression while preserving backend authority. | Frontend would need optimistic canonical overrides or each backend would guess differently. |
| Frontend pending-submit UI | DS-031, DS-032, DS-034 | Frontend runtime status renderer/local submission UI owner | Show responsive submitting controls/optimistic messages without changing canonical runtime status. | UX can stay responsive while status remains backend-driven. | Stores/components would keep writing runtime status locally. |
| Provider raw status adaptation | DS-033 | Backend provider status projection owner | Translate provider lifecycle tokens to canonical statuses before public payloads. | Raw provider tokens are runtime internals, not public aliases. | Removing mapping globally loses `initializing`; keeping it in frontend widens public status compatibility. |
| Team status snapshot identity | DS-035 | Mixed manager/status snapshot service | Attach `member_route_key`/`source_path` to team member status snapshots. | Strict nested routing requires canonical identity. | Frontend would need display-name or focused-member fallbacks. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Definition graph traversal | `agent-team-execution/services/team-definition-traversal-service.ts` | Extend/Replace | Existing service has cycle logic but returns flat leaves. | New topology planner should own recursive executable graph; old flat collector is not enough. |
| Team runtime abstraction | `TeamRun` / `TeamRunBackend` | Reuse | Child team member can be represented by an internal `TeamRun`. | N/A |
| Agent runtime abstraction | `AgentRun` / `AgentRunManager` | Reuse | Agent members remain individual runs. | N/A |
| Event processing | `publishProcessedTeamAgentEvents` and default event pipeline | Reuse/Extend | Agent event normalization already exists. | Need path attribution extension for subteam events. |
| Live recipient input echo | Existing `ServerMessageType.EXTERNAL_USER_MESSAGE` transport and external-user handler | Extend | Transport/client already know how to display user-visible input messages. | Need a team-domain `MEMBER_INPUT` event so this is not confused with external-channel ingress. |
| Run projection merge | `AgentRunViewProjectionService.mergeProjectionBundles` | Extend | It already owns local/primary/fallback projection merging. | Needs semantic dedupe instead of exact JSON row dedupe. |
| Metadata store | `TeamRunMetadataService` / `TeamRunMetadataMapper` | Extend | Same durable storage should store recursive metadata. | N/A |
| Native nested team reference | AutoByteus-ts `TeamManager`, `TeamEventBridge`, `SubTeamShutdownStep` | Reuse as design reference | Behavior is local package, not server runtime abstraction. | Direct reuse is not possible for Codex/Claude server runs. |
| Initializing status UX from `origin/personal` | Frontend status helpers and docs from `agent-initializing-status-ux` | Reintegrate/Extend | The behavior is already merged to the base branch and is a release expectation. | Current nested branch cleanup must reapply the invariant with nested route/path identity instead of reverting the whole cleanup. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Team definition / topology planning | Recursive definition resolution, validation, identity derivation, launch config matching. | DS-001 | `TeamRunService` | Create New / Replace flat traversal | Put under `agent-team-execution/services`. |
| Team run domain model | Recursive/discriminated config, runtime context, events. | DS-001, DS-003, DS-004 | All team backends | Extend | Must be semantically tight. |
| Mixed backend runtime | Agent/subteam member lifecycle and routing. | DS-002, DS-003, DS-005 | `MixedTeamManager` | Extend | Main implementation work. |
| Run history metadata | Recursive metadata and restore context. | DS-004 | `TeamRunMetadataMapper` | Extend | Canonical `TeamRunMetadata` stores child runs inside parent metadata, not top-level history. |
| API/WebSocket transport | Path-aware stream payloads and target identity fields. | DS-004, DS-009, DS-012 | Stream handler/resolvers | Extend | Transport remains off-spine; accepts/emits path/route selectors for nested commands, live member input, and approvals. |
| Live member input streaming | Backend member input events and frontend `EXTERNAL_USER_MESSAGE` handling/upsert. | DS-005, DS-006, DS-007, DS-009 | Member handles, stream handler, `TeamStreamingService` | Extend | Fixes Round 5 live child transcript gap without deriving from communication panel events. |
| Run projection normalization | Semantic conversation/activity dedupe for merged projection sources. | DS-015 | `AgentRunViewProjectionService` | Extend/Create small owned normalizer | Fixes Round 5 timestamp/null duplicates at GraphQL source. |
| Frontend team topology/read model | Recursive `TeamMemberNode` display tree, route-key indexes, leaf agent lookup maps. | DS-016 | `AgentTeamContextsStore` | Extend/Create reusable frontend topology utility | Replaces leaf-only display topology. |
| Frontend workspace/history/team UI | Recursive tree rendering, subteam focus/group cards, nested launch config groups. | DS-016, DS-019 | Workspace/team components | Extend | Must show subteam nodes in active and historical UI. |
| Parent-boundary communication bridge | Controlled child-to-parent report routing and nested sender normalization. | DS-020, DS-021, DS-022 | Child and parent `MixedTeamManager` | Extend mixed runtime/team communication | Reuses `InterAgentMessageDeliveryRequest`, `TeamCommunicationService`, and `MEMBER_INPUT` rather than a new global messaging system. |
| Frontend streaming/activity/communication | Path-aware event dispatch, approval identity, participant displays. | DS-009, DS-010, DS-011, DS-012 | `TeamStreamingService`, `TeamCommunicationStore` | Extend | Keeps event identity aligned with backend `sourcePath`. |
| Frontend presentation policy | Stable nested member primary/secondary labels. | DS-017 | `useTeamMemberPresentation` | Extend | Prevents active/history label drift. |
| Runtime status projection | Provider-edge raw status mapping to canonical public statuses and canonical status payload typing. | DS-033 | Backend provider status projectors / `normalizeAgentApiStatus` | Extend | Restore personal-branch initializing semantics without accepting raw public status aliases. |
| Backend runtime lifecycle status | Accepted-startup state, canonical `initializing`/`running`/terminal transitions, member/group/team aggregate startup settlement, and snapshot correctness. | DS-031, DS-032, DS-034 | `AgentRun`/provider backends, `MixedTeamManager`, mixed member handles | Extend/Refactor | Prevents `offline -> initializing -> offline` regression at the source of truth. |
| Frontend runtime status rendering/local pending UI | Backend status rendering, local pending submit controls, optimistic message rows, and stale history/live merge. | DS-031, DS-032, DS-034 | `agentRuntimeStatusState`, `agentRunStore`, `agentTeamRunStore`, run-history stores | Refactor | Removes frontend as canonical status writer while preserving responsive UI. |
| Team status snapshot routing | Member snapshot route/path identity and strict nested frontend dispatch. | DS-035 | Mixed member snapshot producer + `TeamStreamingService` | Extend | Team members need the same status visibility as individual agents. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `team-run-member-config.ts` | Team run domain | Config model | Discriminated agent/subteam member config types. | Shared by service/factories/managers. | Yes |
| `team-run-member-identity.ts` | Team run domain | Identity model | Member path/route key construction and matching. | Prevent duplicate ad hoc path code. | Yes |
| `team-definition-topology-planner.ts` | Topology planning | Planner | Build recursive executable config tree from definitions and launch config. | Owns graph-specific logic. | Yes |
| `mixed-team-member-handle.ts` | Mixed runtime | Member contract | Common command/event/status interface. | Keeps manager independent of concrete member kinds. | Yes |
| `mixed-agent-member-handle.ts` | Mixed runtime | Agent member handle | AgentRun lifecycle and command adapter. | One concrete member type. | Yes |
| `mixed-sub-team-member-handle.ts` | Mixed runtime | Subteam member handle | Child TeamRun lifecycle and command adapter. | One concrete member type. | Yes |
| `mixed-team-member-registry.ts` | Mixed runtime | Member handle registry | Resolve/cache handles by route key/path; when a nested route enters a subteam, derive the executable top-level handle segment internally from the route/path. | Keeps lookup policy out of manager flow without exposing top-level-name selectors. | Yes |
| `mixed-sub-team-run-factory.ts` | Mixed runtime | Child run factory | Create/restore parent-owned internal child `TeamRun` from subteam config/context without registering it as a top-level active/history run. | Avoids using global top-level run manager for internal members. | Yes |
| `mixed-team-event-bridge.ts` | Mixed runtime | Event bridge | Prefix child event paths and publish to parent. | Isolates event path rewrite. | Yes |
| `parent-boundary-bridge.ts` or owned types in `mixed-team-run-context.ts` | Mixed runtime | Parent-boundary bridge contract | Serializable parent link plus delivery handler wiring for child-to-parent reports. | Keeps upward reporting explicit and scoped. | Yes |
| `member-team-recipient.ts` or owned types in `member-team-context.ts` | Team communication domain | Communication recipient descriptor | Distinguish local agents, subteam representatives, parent-boundary agents, and parent-boundary representatives using one delivery/participant coordinate shape. | Avoids flat recipient-name policy spread across runtimes. | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Member path and route key derivation | `agent-team-execution/domain/team-run-member-identity.ts` | Team run domain | Used by topology, metadata, context, stream. | Yes | Yes | A generic string helper with no team semantics. |
| Discriminated member config/context narrowing | `team-run-member-config.ts`, `team-run-member-context.ts` | Team run domain | Avoid repeated `"agent_team"` checks. | Yes | Yes | A kitchen-sink config with optional agent/team fields. |
| Recursive metadata flattening for projections | `team-run-metadata-flattener.ts` | Run history metadata | Existing projections need leaf/member views. | Yes | Yes | Compatibility wrapper preserving old schema as authoritative. |
| Scoped send-message recipients | `member-team-context.ts` / `member-team-recipient.ts` | Team communication domain | Tool handlers, instructions, and child manager routing need the same recipient scope model. | Yes | Yes | A flat list that treats parent recipients as local teammates. |
| Frontend recursive member tree and leaf indexes | `autobyteus-web/utils/teamDefinitionMembers.ts` plus frontend context types | Frontend team topology | Draft/config/history/workspace components need one topology shape. | Yes | Yes | A flattening helper that hides subteam nodes. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentTeamMemberRunConfig` | Yes | Yes | Low | Contains only agent run fields. |
| `SubTeamMemberRunConfig` | Yes | Yes | Low | Contains child team definition/run fields and recursive members only. |
| `memberPath` + `memberRouteKey` | Yes | Yes | Medium | Define route key as derived from path and never maintain two unrelated values. |
| `TeamRunMetadata` | Yes | Yes | Medium | Use one discriminated recursive metadata schema; keep flattened projections as derived views and avoid version suffixes/fields. |
| `TeamRunEvent.sourcePath` | Yes | Yes | Low | Single canonical domain source identity; all display/route aliases derive from it. |
| Frontend `TeamMemberNode` | Yes | Yes | Medium | Distinguish `agent` and `agent_team`; keep leaf `AgentContext` outside subteam nodes and indexed by route key. |

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
| `autobyteus-server-ts/src/run-history/store/team-run-metadata-store.ts` | Run history metadata | Persistence schema boundary | Validate/write canonical recursive `memberTree`; remove `runVersion`/flat `memberMetadata` as valid runtime schema; expose typed legacy-unmigrated diagnostics for migration/history callers. | Store is the JSON schema gate, not a migration owner. |
| `autobyteus-server-ts/src/run-history/store/team-run-metadata-schema.ts` (extract if needed) | Run history metadata | Canonical metadata schema/validator | Shared current-schema normalization/validation used by store and by migration output validation. | Lets migration validate converted output without putting legacy conversion inside the store. |
| `autobyteus-server-ts/src/app-data-migrations/domain/app-data-migration-types.ts` | App data migration | Migration contract | Migration definition/result/status/item-detail types. | Gives all migrations one status/result vocabulary. |
| `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts` | App data migration | Registry | Register migration definitions and startup policy. | Keeps migrations discoverable for runner and GraphQL. |
| `autobyteus-server-ts/src/app-data-migrations/app-data-migration-runner.ts` | App data migration | Runner/orchestrator | Run pending/explicit migrations, lock per migration, handle stale RUNNING, aggregate results, update DB records. | Owns sequencing and idempotent retry policy. |
| `autobyteus-server-ts/src/app-data-migrations/repositories/app-data-migration-record-repository.ts` | App data migration | DB record store | Persist status, attempts, timestamps, summary JSON, errors, and log paths in the application database. | Satisfies durable migration visibility. |
| `autobyteus-server-ts/src/app-data-migrations/migrations/team-run-metadata-member-tree-migration.ts` | App data migration | Concrete metadata migration | Scan legacy team metadata, convert to canonical memberTree, backup, atomic write, per-item result details. | Keeps legacy schema knowledge isolated to one migration. |
| `autobyteus-server-ts/src/run-history/services/team-run-metadata-flattener.ts` | Run history metadata projections | Derived metadata view owner | Flatten canonical `memberTree` into leaf-agent and top-level member views for projection consumers. | Avoids every consumer rediscovering recursive traversal and prevents old flat schema from remaining authoritative. |
| `autobyteus-server-ts/src/run-history/services/team-run-history-index-service.ts` | Run history projection | History index projection consumer | Use flattener-derived workspace/member summaries instead of `metadata.memberMetadata`. | Current code reads flat metadata directly. |
| `autobyteus-server-ts/src/run-history/services/team-run-history-service.ts` | Run history projection | Resume/history DTO consumer | Use flattener-derived views for resume config and summaries; expose tree where needed; catch typed legacy-unmigrated diagnostics so normal history/sidebar queries do not fail with raw metadata errors. | Current code reads flat metadata directly and can leak parser failures to UI. |
| `autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts` / restore mutation result DTO | GraphQL API | Restore/open degraded result boundary | Map typed legacy-unmigrated metadata diagnostics to a friendly result/error code without starting runtime. | Direct restore/open needs controlled UX, not raw exceptions. |
| `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts` / restore caller | Frontend restore/open | Operation result handling | Handle legacy-unmigrated result by preventing activation and routing user toward Settings -> Server -> Migrations. | Direct open/restore can bypass history/sidebar hydration. |
| `autobyteus-server-ts/prisma/schema.prisma` + migration SQL | Persistence | Migration record schema | Add `AppDataMigrationRecord` table/model with unique migration ID, status, attempts, timestamps, summary/error/log fields. | Database records which app data migrations ran. |
| `autobyteus-server-ts/src/api/graphql/types/app-data-migrations.ts` | GraphQL API | Migration status/retry boundary | Query registered migration statuses and retry/run a migration by ID. | Frontend Settings needs observable migration state. |
| `autobyteus-server-ts/src/api/graphql/schema.ts` | GraphQL API | Resolver registration | Register the app-data migration resolver. | Exposes the new settings surface. |
| `autobyteus-server-ts/src/run-history/services/team-member-run-view-projection-service.ts` | Run history projection | Leaf member projection consumer | Resolve only agent leaf metadata from the flattener by route key/path. Reject subteam route keys when an agent projection is requested. | Current code assumes every metadata member is an agent. |
| `autobyteus-server-ts/src/run-history/services/run-file-change-projection-service.ts` | Run history projection | File-change projection consumer | Resolve leaf agent members through flattener-derived agent metadata. | Current code searches flat `memberMetadata`. |
| `autobyteus-server-ts/src/agent-team-execution/domain/member-team-context.ts` | Team communication domain | Member/recipient descriptor contract | Keep structural `members` as same-boundary descriptors and add scoped `communicationRecipients` for local agents, subteam representatives, and parent-boundary recipients. | Parent and child agents need representative/upward communication without fake local teammates or flat name-only routing. |
| `autobyteus-server-ts/src/agent-team-execution/services/member-communication-roster-builder.ts` | Team communication domain | Communication roster owner | Derive scoped `communicationRecipients` from structural topology, subteam coordinator identities, parent-boundary bridge input, and uniqueness policy. | Keeps representative/downward/upward visibility policy out of runtime tool adapters and structural member lists. |
| `autobyteus-server-ts/src/agent-team-execution/services/member-team-context-builder.ts` | Team communication domain | Descriptor builder | Build member-kind-aware local descriptors plus scoped communication recipient descriptors from `MemberCommunicationRosterBuilder`; derive `allowedRecipientNames` only for tool schema/instructions. | Subteam representatives and upward report recipients need path/scope/representation identity, not only names. |
| `autobyteus-server-ts/src/agent-team-execution/services/member-team-roster-manifest.ts` (or equivalent owned file) | Team communication presentation | Roster manifest builder/renderer | Convert scoped communication descriptors and team display metadata into a named team membership manifest for LLM instructions. | Keeps prompt mental-model formatting separate from routing descriptors while avoiding duplicated renderer logic. |
| `autobyteus-server-ts/src/agent-team-execution/services/member-run-instruction-composer.ts` | Agent runtime instruction composition | Prompt composer | Inject the roster manifest plus exact allowed `recipient_name` list into member instructions. | The LLM needs human team-membership context, not implementation routing-scope headings. |
| `autobyteus-server-ts/src/agent-team-execution/domain/inter-agent-message-delivery.ts` | Team communication domain | Delivery command DTO | Define the participant-shaped request: `teamRunId`, sender participant, recipient participant plus selector, content, references, and trace IDs using `TeamMemberAddress`. Do not keep loose scalar identity fields. | Enables path-safe parent-to-representative delivery and child-to-parent reporting with nested sender identity. |
| `autobyteus-server-ts/src/agent-team-execution/services/inter-agent-message-router.ts` | Team communication runtime | Agent recipient adapter | Accept resolved agent member delivery only; subteam delivery is owned by `MixedSubTeamMemberHandle`. | Avoids routing subteam messages through an agent-only router. |
| `autobyteus-server-ts/src/agent-team-execution/services/inter-agent-message-runtime-builders.ts` | Team communication runtime | Message/event builders | Build member-kind-aware communication events and recipient-visible messages with path/route identity. | Current payload names are agent-only. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-sub-team-run-factory.ts` | Mixed runtime | Child factory / bridge wiring | Accept parent-boundary bridge/link input when creating/restoring internal child TeamRuns. | Child managers need a parent-owned delivery bridge; global run lookup is forbidden. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts` | Mixed runtime | Local and upward communication owner | Route participant-shaped delivery requests. For nested representative selectors, resolve the executable top-level subteam handle while publishing actual leaf sender/receiver participants; for parent-boundary descriptors, delegate through the bridge instead of resolving locally. | Parent-to-representative delivery must publish receiver `BuildSquad/review_lead`; parent-boundary reports must preserve sender `BuildSquad/review_lead` and deliver to parent recipients. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/team-communication/codex-send-message-dynamic-tool-registration.ts` and Claude send-message handlers | Agent runtime tool adapters | Tool recipient adapter | Resolve parsed `recipient_name` against `communicationRecipients` descriptors instead of structural `members`; build sender/recipient participants from the descriptor `delivery` and `participant` shapes before calling delivery. | Tool adapters are the edge between model output and scoped communication identity. |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run-event.ts` | Team run domain events | Event contract | Add `TeamRunEventSourceType.MEMBER_INPUT` and `TeamRunMemberInputEventPayload` for accepted recipient-side inputs. | Live leaf transcript cannot be derived from parent communication events. |
| `autobyteus-server-ts/src/agent-team-execution/services/team-member-input-event-builder.ts` (or equivalent owned file) | Team runtime events | Member input event builder | Build stable message IDs/dedupe keys, recipient identity, sender trace fields, and context/reference metadata for `MEMBER_INPUT`. | Avoids duplicating payload construction across agent and subteam/member delivery paths. |
| `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts` | WebSocket transport | Event mapper | Map `MEMBER_INPUT` to `EXTERNAL_USER_MESSAGE` with `source_path`, `member_route_key`, `message_id`, `dedupe_key`, and sender/communication trace fields. | Round 5 live child transcript depends on route-aware transport payloads. |
| `autobyteus-server-ts/src/run-history/projection/run-projection-dedupe.ts` (or equivalent owned normalizer) | Run history projection | Semantic dedupe | Dedupe conversation rows from merged local/provider projections and prefer timestamped/richer rows. | Exact JSON merge leaves duplicate `ts: null` messages. |
| `autobyteus-server-ts/src/run-history/services/agent-run-view-projection-service.ts` | Run history projection | Projection merge owner | Invoke semantic dedupe when combining local, primary, complementary, and fallback projections. | GraphQL should not return duplicate logical rows. |
| `autobyteus-server-ts/src/services/team-communication/team-communication-types.ts` | Team communication projection | Projection schema | Store sender/receiver participants with member kind, path, route key, run IDs, optional team definition ID, and represented-subteam metadata. | Projection must represent subteam representatives without losing the structural team boundary. |
| `autobyteus-server-ts/src/services/team-communication/team-communication-normalizer.ts` | Team communication projection | Projection normalizer | Normalize member-kind-aware communication payloads from team events. | Current normalizer consumes agent-shaped sender/receiver fields. |
| `autobyteus-server-ts/src/services/team-communication/team-communication-service.ts` | Team communication projection | Projection event consumer | Consume canonical team communication events, not only `TeamRunEventSourceType.AGENT` with `TEAM_COMMUNICATION_MESSAGE`. | AC-003 depends on parent-level representative-recipient projection with represented-subteam context. |
| `autobyteus-web/services/agentStreaming/handlers/externalUserMessageHandler.ts` | Frontend stream handling | Leaf transcript input handler | Upsert user messages by `message_id`/`dedupe_key` and use `received_at` from backend input event. | Avoids duplicates when backend echoes direct leaf sends and adds missing subteam child prompts. |
| `autobyteus-web/services/runHydration/runProjectionConversation.ts` | Frontend projection hydration | Defensive conversation builder | Dedupe stale projection rows before building `Conversation`; preserve backend ordering after dedupe. | UI should remain robust even if cached/stale payload contains duplicate rows. |
| `autobyteus-web/composables/useTeamMemberPresentation.ts` | Frontend presentation | Label policy owner | Primary labels come from membership node display/member name; route and agent definition names are secondary. | Active/history label drift is caused by component-local label choices. |
| `autobyteus-web/stores/runHistoryTeamRows.ts` | Frontend history/read model | Team row builder | Use node/member labels as primary and call/shared presentation policy instead of preferring `agentDefinitionName`. | Active rows currently display agent definition names while history rows display member names. |

## Ownership Boundaries

- `TeamRunService` is the authoritative top-level create/restore service. It may call topology planning and metadata mapping; callers must not directly build mixed contexts.
- `TeamDefinitionTopologyPlanner` is the authoritative definition graph interpreter for execution. Backends must not independently flatten or reinterpret team definitions.
- `MixedTeamManager` is the authoritative runtime owner for one mixed team run. Callers above it use `MixedTeamRunBackend`/`TeamRun`; they must not directly access member handles or child team runs.
- `MixedTeamMemberHandle` implementations encapsulate concrete provider/lifecycle differences. `MixedTeamManager` calls the common interface and does not special-case `AgentRun` versus `TeamRun` except at construction/registry boundaries.
- `TeamRunMetadataStore` is the authoritative durable metadata JSON schema boundary. It validates only canonical recursive `TeamRunMetadata.memberTree`, rejects historical flat metadata explicitly, and does not return silent `null` for old-schema payloads.
- `TeamRunMetadataMapper` maps runtime config/context to canonical recursive metadata and restore context. It does not own raw JSON schema validation and must not compatibility-read flat metadata.
- `team-run-metadata-flattener.ts` is the authoritative derived-view owner for flat leaf-agent/top-level member projections over canonical `memberTree`. Projection consumers must not read historical `memberMetadata` or duplicate recursive traversal.
- Backend member input event producer is the authoritative live source for recipient-side user/inbound transcript rows. Frontend code must not infer child leaf prompts from parent team communication messages.
- `AgentRunViewProjectionService` plus the projection dedupe normalizer is the authoritative backend owner for removing duplicate projection rows before GraphQL returns them.
- Frontend `AgentTeamContextsStore` is the authoritative active team UI context owner. Components read recursive member nodes from it; they must not rebuild flat members from definitions.
- Frontend topology utilities own recursive `TeamMemberNode` construction and derived leaf-agent lists. Launch config builders use the derived leaves; display components use the tree.
- Frontend `TeamStreamingService` owns client-side stream event routing by source path/route key. Handlers must not fall back to the focused member when canonical nested identity is present.
- Backend runtime lifecycle owners own canonical status. Frontend status utilities/stores render backend status and local pending UI only; they must not write canonical `initializing` in response to local submit acceptance.
- Frontend `TeamCommunicationStore` owns nested communication read-model normalization with sender/receiver participant identity.
- `ParentBoundaryBridge` is the only allowed child-to-parent delivery bridge for internal child runs. It is built by the parent subteam handle/factory and must not be replaced by global top-level run lookup.
- `MemberCommunicationRosterBuilder` owns the distinction between structural members, subteam representatives, and parent-boundary reporting recipients. `MemberTeamContextBuilder` attaches those descriptors to member contexts; tool adapters consume descriptors and must not infer recipients from structural names.
- `TeamMembershipRosterManifest` / `MemberRunInstructionComposer` owns only LLM-facing roster presentation. It may group descriptors by team names and roles, but it must not become a routing resolver or change descriptor identity.
- Frontend `runProjectionConversation` owns projection-to-conversation hydration and defensive row dedupe, but it is not the primary duplicate-fix boundary.
- Frontend `useTeamMemberPresentation` owns primary/secondary member labels across active and history surfaces.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TeamRunService` | Topology planner, metadata mapper, backend manager. | GraphQL, application launch, external channel launch. | Callers build `TeamRunConfig` trees directly from definitions. | Add explicit service method/input. |
| `TeamDefinitionTopologyPlanner` | Recursive traversal, cycle checks, route identity. | `TeamRunService`, metadata restore helpers. | Mixed factory re-loads definitions and computes routes itself. | Add planner output field. |
| `MixedTeamManager` | Member handle registry, member handles, event subscriptions. | `MixedTeamRunBackend`, child member handles. | Backend or transport directly calls `AgentRunManager` for mixed members. | Add manager command. |
| `MixedTeamMemberHandle` | Concrete AgentRun/TeamRun command mapping. | `MixedTeamManager`. | Manager stores `AgentRun` and `TeamRun` in parallel maps and switches everywhere. | Extend handle interface. |
| `TeamRunMetadataStore` | Canonical recursive metadata validation/read/write plus typed legacy-unmigrated diagnostics. | `TeamRunService`, run-history services, app data migration output validation. | Store accepts `runVersion`/flat `memberMetadata`, silently returns `null`, or migrates old schema inline. | Keep store current-schema-only; expose diagnostics, not conversion. |
| `AppDataMigrationRunner` | App data migration sequencing, locking, status recording, and retry. | Server startup, GraphQL migration retry resolver. | Startup scripts or UI components modify metadata files directly. | Add a registered migration and runner API. |
| `TeamRunMetadataMemberTreeMigration` | Legacy flat team metadata conversion only. | `AppDataMigrationRunner`. | Runtime restore/frontend parsers convert old `memberMetadata`. | Keep legacy schema knowledge isolated to this migration. |
| `AppDataMigrationRecordRepository` | Durable migration status in DB. | Runner and GraphQL status resolver. | Migration status inferred from files or logs only. | Persist per-migration records. |
| `TeamRunMetadataMapper` | Runtime config/context <-> canonical metadata conversion. | `TeamRunService`. | Mapper reads raw JSON files, validates old schemas, or guesses topology from definitions. | Add mapper helper over canonical `TeamRunMetadata`. |
| `team-run-metadata-flattener.ts` | Derived flat views from `memberTree`. | Run-history/member/file-change projections. | Projections read `metadata.memberMetadata` or each duplicate recursive traversal. | Add flattener helper for the needed derived view. |
| `ParentBoundaryBridge` | Parent mixed manager delivery handler and scoped parent-boundary communication recipients. | Child `MixedTeamManager` / child member contexts. | Child manager looks up global runs or treats parent members as local teammates. | Add scoped bridge API and communication recipient descriptors. |
| `MemberCommunicationRosterBuilder` / `MemberTeamContextBuilder` | Local members, subteam representatives, and scoped communication recipient descriptors. | Tool adapters and member-run instruction composer. | Tool handlers search only structural `members` or construct ad hoc selectors for hidden recipients. | Add `communicationRecipients` lookup and derived tool names. |
| `TeamMembershipRosterManifest` / `MemberRunInstructionComposer` | Organization-style roster text derived from descriptors and team display metadata. | Runtime backend instruction builders. | Prompt text exposes internal routing-scope labels as the organization model, or prompt renderer derives recipients independently from `members`. | Add manifest builder over `communicationRecipients`. |
| Backend `MEMBER_INPUT` event producer | Accepted recipient-side input payloads and message identity. | Member handles, stream handler, frontend transcript. | Frontend derives child leaf prompts from parent communication events or `INTER_AGENT_MESSAGE` original-content events. | Add member input event payload and producer at the accepting leaf boundary. |
| `AgentRunViewProjectionService` | Merged local/provider projection bundle. | `getTeamMemberRunProjection`, run-open/hydration. | Frontend components hide duplicates while GraphQL still returns them. | Add semantic projection dedupe normalizer at merge point. |
| Frontend `AgentTeamContextsStore` | `memberTree`, member-node indexes, leaf-agent contexts, focus identity. | Workspace tree, team panels, grid, spotlight, composer. | Components call `resolveLeafTeamMembers` and render flat leaves directly. | Add context getters for tree nodes, visible children, and leaf contexts. |
| Frontend `TeamStreamingService` | Source-path/route-key event dispatch and approval identity. | Stream handlers and activity panels. | Handlers attach nested events to focused member or non-authoritative `agent_name` display aliases. | Add canonical route/source path resolution helper. |
| Frontend `TeamCommunicationStore` | Sender/receiver participant normalization and grouping. | Activity/team communication panels. | UI groups only by run ID/name and loses subteam identity. | Add participant-aware store API. |
| Frontend `useTeamMemberPresentation` | Primary/secondary label policy. | Running rows, history rows, team panels, grid, spotlight, header. | Components independently prefer agent definition name, route key, or member name. | Add one presentation API and use it everywhere. |

## Dependency Rules

Allowed:

- `TeamRunService -> TeamDefinitionTopologyPlanner -> AgentTeamDefinitionService`
- `TeamRunService -> AgentTeamRunManager -> MixedTeamRunBackendFactory`
- `MixedTeamRunBackend -> MixedTeamManager`
- `MixedTeamManager -> MixedTeamMemberRegistry -> MixedTeamMemberHandle`
- `MixedAgentMemberHandle -> AgentRunManager`
- `MixedSubTeamMemberHandle -> MixedSubTeamRunFactory -> MixedTeamRunBackendFactory` for internal child runs
- `MixedSubTeamMemberHandle -> ParentBoundaryBridge -> child MixedTeamManager -> parent MixedTeamManager.deliverInterAgentMessage` for controlled child-to-parent reports
- Tool adapters (`send_message_to`) -> `MemberTeamContext.communicationRecipients` -> `InterAgentMessageDeliveryRequest` selectors/scope/representation metadata
- Transport/GraphQL command adapters -> explicit path/route payload fields -> `TeamMemberSelector`
- `MemberRunInstructionComposer -> TeamMembershipRosterManifest builder -> MemberTeamContext.communicationRecipients` for prompt roster text only
- `MixedAgentMemberHandle / child MixedAgentMemberHandle -> team-member-input-event-builder -> MixedTeamManager.publish`
- `AgentTeamStreamHandler.convertTeamEvent -> MEMBER_INPUT payload -> EXTERNAL_USER_MESSAGE transport payload`
- `TeamRunMetadataStore -> TeamRunMetadata` canonical schema validation
- `TeamRunMetadataMapper -> TeamRunConfig/Context domain types`
- `Run-history projection consumers -> team-run-metadata-flattener.ts -> TeamRunMetadata.memberTree`
- `AgentRunViewProjectionService -> run-projection-dedupe -> RunProjection`
- `autobyteus-web/stores/agentTeamContextsStore -> autobyteus-web/utils/teamDefinitionMembers.ts -> AgentTeamDefinitionStore` for draft trees
- `autobyteus-web/stores/runHistoryMetadata.ts -> TeamRunMetadata.memberTree` for restored/historical trees
- `autobyteus-web/components/workspace/* -> AgentTeamContextsStore` for active member tree and focus state
- `autobyteus-web/services/agentStreaming/TeamStreamingService -> AgentTeamContext.memberNodesByRouteKey / leafAgentContextsByRouteKey`
- `autobyteus-web/components/workspace/* -> useTeamMemberPresentation` for labels instead of direct `agentDefinitionName` precedence
- Provider backend/projector -> backend internal status normalizer -> canonical `AgentStatusPayload`
- Backend run/member lifecycle owner -> canonical status payload/snapshot -> frontend status renderer
- `agentRunStore` / `agentTeamRunStore` -> local pending-submit UI and optimistic messages only; canonical status arrives from backend stream/snapshot
- `AgentStreamHandler` / `TeamRuntimeStatusSnapshotService` -> canonical backend status payloads with route/path identity -> frontend status renderer

Forbidden:

- Transport/resolvers directly constructing `MixedTeamMemberContext` or child `TeamRun`s.
- `MixedTeamManager` directly managing separate `Map<string, AgentRun>` and `Map<string, TeamRun>` as public policy; use member handles.
- Runtime event consumers guessing nested identity from member names; use `sourcePath`/route key.
- Frontend stores/helpers writing canonical `currentStatus = initializing` on accepted local submit.
- Backend accepting startup while `getStatusSnapshot()` still returns `offline`/`idle` for that run/member.
- Backend cleanup removing provider-edge startup-token mapping and thereby expecting frontend public normalizers to recover raw provider lifecycle names.
- Frontend or stream handlers deriving child leaf user prompts from `TEAM_COMMUNICATION_MESSAGE`; backend `MEMBER_INPUT` owns recipient transcript rows.
- Mixed nested delivery relying on `INTER_AGENT_MESSAGE` as the canonical leaf transcript event; use `MEMBER_INPUT` for recipient-visible prompts and `COMMUNICATION` for team messages.
- Metadata store, mapper, frontend parser, or restore path keeps old flat restore support, inline migration branches, dual schemas, silent `null` fallback, or runtime recovery for historical team metadata. Legacy conversion belongs only to app data migrations.
- Run-history projection consumers read `metadata.memberMetadata` directly; use flattener-derived views over `memberTree`.
- Projection consumers or components suppress duplicate projection rows locally while backend `getTeamMemberRunProjection` still returns duplicate logical messages.
- Child team members bypassing the parent-boundary bridge to directly send to arbitrary parent/grandparent/sibling leaf agents. Controlled immediate-parent reporting must use scoped `communicationRecipients`.
- Frontend components using `resolveLeafTeamMembers` or `AgentTeamContext.members` as the display topology.
- Frontend launch config lookup by flat child `memberName` for nested leaves.
- Frontend current metadata parser accepting `runVersion`/flat `memberMetadata` as the canonical restore schema.
- Normal Agents/workspace/sidebar components displaying raw migration/parser exception text for legacy team metadata instead of relying on migration status/friendly unavailable handling.
- Migration scripts running secretly without durable database status, retry behavior, or Settings -> Server -> Migrations visibility.
- Frontend stream handlers routing canonical nested events to the focused member because `agent_name` is missing or ambiguous.
- Frontend components independently choosing primary labels from `agentDefinitionName` for active rows and `memberName` for history rows.
- Instruction composers deriving allowed recipients from structural `members`, or using implementation scope names such as `parent_boundary_agent` as LLM-facing roster headings.
- Command adapters accepting `target_member_name`, `target_agent_name`, command-side `agent_name`, command-side `agent_id`, or camelCase equivalents as team member targets.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `TeamDefinitionTopologyPlanner.buildPlan(input)` | Team definition topology | Build recursive executable topology. | `teamDefinitionId + launch configs keyed by memberRouteKey/memberPath` | Reject ambiguous names. |
| `TeamRun.postMessage(message, selector)` | Public team command | Route user message through the backend command chain. | `TeamMemberSelector` built from explicit path/route fields. | Default target resolves to coordinator selector. |
| `TeamRunBackend.postMessage(message, selector)` | Backend command interface | Carry selector to concrete backend. | `TeamMemberSelector`. | No raw string target in backend contract. |
| `TeamManager.postMessage(message, selector)` | Manager command interface | Manager-level routing. | `TeamMemberSelector`. | Flat managers reject nested path selectors. |
| `TeamMemberSelector` (`team-run-member-identity.ts`) | Team run identity | Canonical command target shape. | `{ memberPath }` or `{ memberRouteKey }` only. | Avoids overloading raw strings or bare names for nested leaf operations. |
| `MixedTeamManager.postMessage(message, selector)` | Mixed team runtime | Route user message to top-level agent or subteam. | `TeamMemberSelector` only; transport edges reject scalar aliases before this method is called. | Subteam target defaults to child coordinator. |
| `MixedTeamManager.deliverInterAgentMessage(request)` | Mixed team runtime | Route participant-shaped member communication. | `request.teamRunId` is the coordinate root; `request.recipient.selector` is relative to that root. Nested selectors may resolve to a top-level subteam handle, but communication identity remains the actual nested participant. | Child-internal communication stays in child manager; parent-to-representative delivery enters through the parent root and subteam handle. |
| `MixedTeamMemberHandle.postMessage(message)` | Member handle | Post user-visible work to agent or team. | No external selector; handle already resolved. | Subteam handle calls child `TeamRun.postMessage(message, null)`. |
| `MixedTeamMemberHandle.deliverInterMemberMessage(request)` | Member handle | Deliver teammate message to resolved executable handle. | Participant-shaped request. For subteam handles, a nested recipient address under the subteam path is stripped into a child-local selector. | Agent and subteam map differently, but event identity stays on request participants. |
| `TeamRunEventSourceType.MEMBER_INPUT` | Team run live transcript event | Represent accepted recipient-side user/inbound input for the actual leaf recipient. | `sourcePath`/`memberRouteKey` of recipient leaf + `messageId`/`dedupeKey`. | Maps to WebSocket `EXTERNAL_USER_MESSAGE`; distinct from parent `COMMUNICATION`. |
| `InterAgentDeliveryTrace` / delivery message IDs | Inter-agent delivery identity | Link parent communication and child/leaf transcript input without conflating them. | `communicationMessageId`, `recipientInputMessageId`, `createdAt`. | Required for dedupe/live/projection consistency. |
| `TeamRunMetadataStore.readMetadata/writeMetadata` | Metadata persistence schema | Persist and validate only canonical recursive metadata. | `TeamRunMetadata.memberTree`; no `runVersion`, no flat `memberMetadata`. | Unmigrated historical flat metadata raises/returns typed legacy-unmigrated diagnostics instead of null, inline migration, or fallback. |
| `TeamRunMetadataMapper.buildRestoreContext(metadata)` | Metadata restore | Rebuild recursive context. | `teamRunId` + recursive `memberTree` shape. | No version field; legacy flat metadata is never inflated by restore. |
| `RunProjectionDedupe.normalize(conversation)` | Run projection normalization | Return one row per logical conversation message. | `messageId`/`dedupeKey` first, semantic fallback keys second. | Timestamped/richer rows win over `ts: null` duplicates. |
| `getTeamMemberRunProjection(teamRunId, memberRouteKey)` | Leaf projection query | Return deduped projection for a leaf agent route. | Parent `teamRunId` + leaf `memberRouteKey`. | Reject subteam route keys for leaf conversation projection. |
| `TeamCommunicationService` canonical communication projection | Team communication projection | Store parent-level member communication including representative participants and represented-subteam metadata. | Sender/receiver participant kind/path/route/run IDs plus `representedSubTeam`. | Does not project an abstract `agent_team` recipient as an agent runtime. |
| GraphQL/WebSocket team communication DTOs | Communication transport projection | Expose backend communication participants, including `sender.representedSubTeam` and `receiver.representedSubTeam`, without flattening or string-only aliases. | DTO fields mirror `TeamCommunicationParticipant` plus represented-subteam object. | Transport may add display aliases, but must not drop represented-subteam identity. |
| Frontend `AgentTeamContextsStore.focusMember(routeKey)` | Active team UI selection | Focus agent leaf or subteam node. | Canonical `memberRouteKey`; may be `agent` or `agent_team`. | Subteam focus opens group view/composer, not `AgentContext` hydration. |
| Frontend launch config builder | Team launch config | Build `TeamMemberConfigInput[]` for leaf agents. | Leaf `memberRouteKey` from recursive tree. | No flat child-name override lookup. |
| `AppDataMigrationRunner.runPending()/runMigration(id)` | App data migration | Execute and record data migrations. | Registered migration ID, startup policy, DB record. | Owns idempotency, stale RUNNING handling, status transitions, and result aggregation. |
| `TeamRunMetadataMemberTreeMigration.execute()` | App data migration | Convert legacy flat team metadata files to canonical metadata. | File path/teamRunId plus current canonical validator. | Backup before write; atomic replace; per-file details. |
| GraphQL `getAppDataMigrations` / `runAppDataMigration(id)` | Settings API | Expose migration status and retry. | Migration ID. | Does not expose raw filesystem write APIs. |
| `AppDataMigrationRunner.runMigration(id)` | App data migration | Manual retry/concurrency execution. | Registered migration ID. | Acquires lock, handles stale `RUNNING`, rejects true duplicate concurrent runs, executes idempotently, records summary/logs. |
| `TeamRunService.restore/open` legacy-unmigrated result | Team run restore/open | Controlled degraded result for old data. | Team run ID with typed metadata diagnostic. | Must not start runtime or guess topology; GraphQL/frontend map to friendly message and migration navigation. |
| Frontend run-history metadata parser | Historical/restore UI | Parse authoritative recursive metadata. | `metadata.memberTree`. | No `runVersion`/`memberMetadata` current schema. |
| Frontend `TeamStreamingService.sendMessage` | Transport command | Send to selected agent leaf or subteam. | `target_member_route_key`/`target_member_path` only. | Selecting `BuildSquad` targets the subteam route key. |
| Frontend `TeamStreamingService.getMemberContext` | Stream dispatch | Attach events to exact node/leaf context. | `source_path`/`member_route_key` are authoritative; display aliases may be read only as non-authoritative presentation metadata. | Prevents nested events attaching to focused parent member. |
| Frontend `handleExternalUserMessage(payload, context)` | Leaf live transcript input | Upsert user/inbound messages from backend `MEMBER_INPUT` transport payload. | `message_id`/`dedupe_key` when present; otherwise timestamp/content fallback. | Must not blindly push duplicates. |
| Frontend `buildConversationFromProjection` | Projection hydration | Build `Conversation` from deduped projection rows and defensively normalize stale duplicates. | Projection entries with optional message identity and semantic fallback. | Backend owns primary dedupe, frontend protects UI. |
| Frontend `useTeamMemberPresentation` | Member labels | Produce primary label and secondary metadata consistently. | `TeamMemberNode` plus optional `AgentContext`. | Primary label never prefers agent definition name over membership label. |
| `approveToolInvocation(selector, invocationId, ...)` | Agent member tool approval | Approve leaf agent tool invocation. | Leaf agent selector derived from approval event `sourcePath`/route key. | Reject top-level subteam targets and all scalar/bare-name or agent-id/name command targets. |
| WebSocket `SEND_MESSAGE` / GraphQL run commands | Transport commands | Adapt client payloads to `TeamMemberSelector`. | Require `target_member_path` or `target_member_route_key`; reject scalar name/id aliases. | Transport remains a mapper, not routing owner. |
| WebSocket/GraphQL tool approval | Transport commands | Approve exact nested leaf. | Require `source_path`/`member_path` or `source_route_key`/`member_route_key` from approval-request event; reject scalar name/id aliases. | Prevents duplicate-name leaf ambiguity. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TeamDefinitionTopologyPlanner.buildPlan` | Yes | Yes | Low | Require path/route-key matching. |
| `MixedTeamManager.postMessage` | Yes | Yes | Low | Accept `TeamMemberSelector` only; transport/domain edge adapters reject scalar aliases and pass path/route selectors only. |
| `MixedTeamManager.deliverInterAgentMessage` | Yes | Yes | Low | Route participant-shaped requests: root-relative representative selectors may resolve to a top-level subteam handle for execution, but communication/event identity remains the actual representative leaf. Parent-boundary requests from child managers go through `ParentBoundaryBridge`. |
| `approveToolInvocation` | Yes | Yes | Low | Approval request events expose `sourcePath`; approval command uses path/route selector and rejects ambiguity. |
| `MEMBER_INPUT` event | Yes | Yes | Low | Source path is the recipient leaf; payload carries message/dedupe identity and optional sender trace. |
| `RunProjectionDedupe` | Yes | Yes | Low | Use identity keys first, semantic timestamp/null fallback second; backend GraphQL returns deduped rows. |
| WebSocket/GraphQL command mappers | Yes | Yes | Low | Map `target_member_path`/`target_member_route_key`/approval `source_path` to domain selectors; reject scalar name/id command aliases. |
| Frontend active team context | Yes | Yes | Low | Store recursive `memberTree` and route-key indexes; never expose flat leaves as display topology. |
| Frontend stream dispatch | Yes | Yes | Low | Resolve by `source_path`/`member_route_key`; treat `agent_name`/`agent_id` only as display metadata, not routing authority. |
| Backend runtime lifecycle status | Yes | Yes | Low | Backend owns canonical `offline`/`initializing`/`idle`/`running`/`error`; accepted startup must be reflected in `getStatusSnapshot()` and status events before frontend renders it. |
| Frontend runtime status rendering | Yes | Yes | Low | Frontend applies backend status payloads and local pending UI separately; it must not author canonical initializing. |
| Backend status projection | Yes | Yes | Low | Provider raw tokens are translated internally to canonical public statuses; public payloads stay canonical. |
| Team status snapshot payload | Yes | Yes | Low | Include `member_route_key`/`source_path` for each nested member status snapshot. |
| Frontend member presentation | Yes | Yes | Low | Use `TeamMemberNode` membership label as primary everywhere; route/definition are secondary. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Recursive graph planner | `TeamDefinitionTopologyPlanner` | Yes | Low | Avoid “helper/traversal” if it owns executable plan. |
| Member handle | `MixedTeamMemberHandle` | Yes | Low | Do not call it “node helper.” |
| Agent concrete handle | `MixedAgentMemberHandle` | Yes | Low | N/A |
| Subteam concrete handle | `MixedSubTeamMemberHandle` | Yes | Low | N/A |
| Event path field | `sourcePath` | Yes | Low | Canonical source identity for all runtime-sourced team events. |
| Member input event | `TeamRunMemberInputEventPayload` / `MEMBER_INPUT` | Yes | Low | Describes accepted recipient-side input, not external-channel-only ingress. |
| Projection dedupe | `RunProjectionDedupe` / `run-projection-dedupe.ts` | Yes | Low | Names the semantic projection normalizer directly. |
| Frontend tree node | `TeamMemberNode` / `TeamMemberTreeNode` | Yes | Low | Data/display tree only; do not use `TeamRuntimeNode`. |
| Frontend focus field | `focusedMemberRouteKey` | Yes | Low | Replace misleading `focusedMemberName`; selected identity is route-key based. |
| Frontend presentation | `useTeamMemberPresentation` | Yes | Low | Shared label policy; not a route/identity resolver. |

## Applied Patterns (If Any)

- Strategy/Adapter: `MixedTeamMemberHandle` is a small polymorphic adapter around `AgentRun` or child `TeamRun` commands.
- Registry: `MixedTeamMemberRegistry` caches and resolves member handles by route key/path.
- Factory: `MixedSubTeamRunFactory` creates/restores internal child team runs.
- Event bridge: `MixedTeamEventBridge` prefixes child event source paths and republishes to parent listeners.
- Event adapter/read model: `MEMBER_INPUT` domain event maps to existing `EXTERNAL_USER_MESSAGE` transport payload for leaf transcript input.
- Normalizer: `RunProjectionDedupe` semantically merges projection rows that represent the same logical message.
- Read model/tree projection: frontend `TeamMemberNode` tree plus route-key indexes separates display topology from leaf conversation lookup.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run-member-identity.ts` | File | Team run domain | Path/route-key identity. | Cross-cutting team-run domain concept. | Runtime creation or persistence. |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run-config.ts` | File | Team run domain | Recursive config union. | Existing config owner. | Definition lookup. |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run-context.ts` | File | Team run domain | Recursive runtime context union. | Existing context owner. | Backend-specific construction. |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run-event.ts` | File | Team run domain events | Canonical event source types, including `sourcePath` and `MEMBER_INPUT` payload. | Existing domain event contract owner. | Transport-specific snake_case payloads. |
| `autobyteus-server-ts/src/agent-team-execution/services/team-definition-topology-planner.ts` | File | Topology planner | Definition graph to config tree. | Service-level planning before backend. | Runtime command routing. |
| `autobyteus-server-ts/src/agent-team-execution/services/team-member-input-event-builder.ts` | File | Member input event construction | Build `MEMBER_INPUT` payloads and delivery trace/dedupe identity from accepted inputs. | Shared by agent and subteam/child delivery paths. | Team communication projection persistence or frontend formatting. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/` | Folder | Mixed runtime | Mixed backend files. | Existing mixed backend folder. | GraphQL transport. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/` | Folder | Mixed member-handle module | Member handle contract and concrete handles. | Mixed folder benefits from structural depth. | Topology definition loading. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/events/` | Folder | Mixed event bridge module | Child event bridge/path rewriting. | Keeps event bridge separate from lifecycle. | Provider event parsing unrelated to team events. |
| `autobyteus-server-ts/src/run-history/store/team-run-metadata-types.ts` | File | Durable metadata schema | Canonical recursive `TeamRunMetadata`. | Existing schema owner. | Mapper logic. |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-metadata-mapper.ts` | File | Metadata mapper | Recursive metadata/context conversion. | Existing mapper owner. | Member handle command logic or raw JSON schema validation. |
| `autobyteus-server-ts/src/run-history/store/team-run-metadata-store.ts` | File | Metadata persistence boundary | Validate/read/write canonical `memberTree`; reject/diagnose `runVersion`/flat `memberMetadata` explicitly for runtime callers. | Store owns current persisted JSON shape. | Inline migration, fallback, topology guessing, or silent invalid-metadata nulling for old schema. |
| `autobyteus-server-ts/src/run-history/store/team-run-metadata-schema.ts` | File | Canonical metadata validation | Shared current-schema validator/normalizer for store and migration output validation. | Prevents migration from importing private store internals or duplicating canonical validation. | Legacy conversion rules. |
| `autobyteus-server-ts/src/app-data-migrations/` | Folder | App data migration subsystem | Registry, runner, repository, types, concrete migrations. | Distinct from Prisma schema migrations and runtime stores. | Normal runtime restore logic. |
| `autobyteus-server-ts/src/app-data-migrations/migrations/team-run-metadata-member-tree-migration.ts` | File | Legacy metadata migration | Convert `runVersion` + flat `memberMetadata[]` to canonical `memberTree` with backup/atomic write. | Isolates old schema knowledge to one registered migration. | Current runtime parser. |
| `autobyteus-server-ts/src/api/graphql/types/app-data-migrations.ts` | File | Migration GraphQL API | Query migration statuses and run/retry one migration. | Settings UI needs a server-owned boundary. | Server settings raw key/value API. |
| `autobyteus-web/stores/appDataMigrationsStore.ts` | File | Frontend migration state | Fetch migration statuses, run retry, expose loading/error state. | Keeps Settings component thin. | Reusing serverSettingsStore for unrelated migration data. |
| `autobyteus-web/graphql/queries/app_data_migrations_queries.ts` / `mutations/app_data_migrations_mutations.ts` | Files | Frontend migration API documents | GraphQL operations for status and retry. | Follows existing settings GraphQL file pattern. | Inline gql in component. |
| `autobyteus-web/components/settings/ServerMigrationsManager.vue` | File | Migration settings UI | List statuses, summaries, details, refresh, retry. | User-visible migration health belongs under server settings. | Main sidebar raw errors. |
| `autobyteus-web/pages/settings.vue` | File | Settings navigation | Add Server -> Migrations subitem/section mode. | Exposes migration UI where user expects server maintenance. | Hidden route only. |
| `autobyteus-server-ts/src/run-history/services/team-run-metadata-flattener.ts` | File | Metadata derived projections | Produce leaf-agent and top-level member views from canonical `memberTree`. | Keeps projection consumers off the canonical schema internals. | Compatibility reading historical flat metadata. |
| `autobyteus-server-ts/src/run-history/projection/run-projection-dedupe.ts` | File | Run projection normalization | Semantic dedupe for conversation rows from multiple projection sources. | Projection package owns cross-provider projection row semantics. | Frontend display policy or provider-specific parsing. |
| `autobyteus-server-ts/src/run-history/services/agent-run-view-projection-service.ts` | File | Run projection merge service | Merge local/primary/fallback projections through semantic dedupe before returning. | Existing owner of projection source merging. | UI-level suppression of duplicates. |
| `autobyteus-web/utils/teamDefinitionMembers.ts` | File | Frontend team topology | Build recursive `TeamMemberNode` trees and derived leaf-agent lists. | Existing frontend topology utility. | Flatten-only display source of truth. |
| `autobyteus-web/types/agent/AgentTeamContext.ts` | File | Frontend active team context | Store recursive tree, route-key indexes, leaf agent contexts, and `focusedMemberRouteKey`. | Existing active team context type. | Subteam-as-agent context. |
| `autobyteus-web/stores/agentTeamContextsStore.ts` | File | Frontend active team owner | Create/focus/hydrate active contexts from recursive tree. | Existing store owns active team contexts. | Rebuilding display from flat leaf members. |
| `autobyteus-web/utils/teamRunMemberConfigBuilder.ts` | File | Frontend launch config builder | Build leaf agent config records from tree-derived leaves keyed by route key. | Existing config builder. | Override lookup by nested flat member names. |
| `autobyteus-web/stores/runHistoryTypes.ts` / `runHistoryMetadata.ts` | Files | Frontend run history metadata | Define/parse recursive `memberTree`; no `runVersion` current schema. | Existing history type/parser owners. | Current flat `memberMetadata` schema. |
| `autobyteus-web/stores/runHistoryTeamHelpers.ts` / `runHistoryReadModel.ts` | Files | Frontend history read model | Build recursive team tree rows from active contexts and metadata. | Existing history projection owners. | Sorting child leaves as parent-level rows. |
| `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` and history section components | Files | Workspace history UI | Render team member rows recursively. | Existing workspace tree UI. | Flat `team.members` rendering only. |
| `autobyteus-web/components/workspace/team/TeamMembersPanel.vue` | File | Active team member tree UI | Render recursive active member tree and subteam rows. | Existing team member panel. | Leaf-only list. |
| `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue` / `TeamGridView.vue` / `TeamSpotlightView.vue` | Files | Active team workspace modes | Support leaf agent tiles and subteam group focus/tile. | Existing mode components. | Assuming every selected member has `AgentContext`. |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` / protocol types | Files | Frontend stream transport | Route by source path/route; send route/path selectors and approval identity; classify/apply member status snapshots with canonical route/path identity. | Existing stream owner. | Bare `agent_name` as nested authority or snapshot downgrade logic in handlers. |
| `autobyteus-web/services/runStatus/agentRuntimeStatusState.ts` | File | Frontend runtime status renderer | Apply backend canonical status payloads, update interrupt/sending flags from backend status, and remove/repurpose accepted-startup helpers so they do not write canonical `currentStatus = initializing`. | Existing shared status utility should render status, not own backend lifecycle. | Frontend-authored canonical initializing or duplicated status guards in components. |
| `autobyteus-web/services/runHydration/runtimeStatusNormalization.ts` | File | Frontend canonical status parser | Accept canonical public statuses from backend/UI state only; do not re-add broad provider lifecycle aliases here because they must be canonicalized at backend edge. | Keeps frontend public status surface clean. | Provider raw status compatibility policy. |
| `autobyteus-web/stores/agentRunStore.ts` | File | Individual run submission owner | Set local pending submit/optimistic message state, send create/restore/message command, and rely on backend status event/snapshot for `initializing`. | Existing single-agent send/create flow. | Mutating canonical runtime status on submit. |
| `autobyteus-web/stores/agentTeamRunStore.ts` | File | Frontend team run transport owner | Launch with canonical leaf route keys; send selected route/path target; set local pending UI for team/subteam sends and rely on backend route/path status events for leaf/group/team `initializing`. | Existing run command store. | Sending flat nested child names, assuming every focused member has an AgentContext, or mutating canonical status locally. |
| `autobyteus-web/stores/runHistoryStore.ts` / `runHistoryLoadActions.ts` | Files | Frontend history status hydration | Hydrate historical status without overwriting newer live backend status; mark active rows consistently with backend stream/snapshot state. | History refresh currently can race live status. | Forcing active rows to running/offline over newer backend live status. |
| `autobyteus-server-ts/src/agent-execution/domain/agent-status-payload.ts` | File | Backend canonical status payload/internal normalizer | Emit canonical public statuses and provide internal provider-edge mapping for raw lifecycle tokens. | Existing status payload boundary. | Removing provider-edge mapping or accepting raw public statuses. |
| `autobyteus-server-ts/src/agent-execution/backends/*/events/*status*` | Files | Provider status projectors | Map backend/provider startup and processing states to canonical public statuses before publication. | Provider-specific raw statuses belong at adapter edge. | Leaking raw lifecycle names to frontend. |
| `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts` | File | Single-agent stream status snapshot owner | Emit backend-authoritative `getStatusSnapshot()`; after accepted startup this snapshot must be `initializing`, not stale `offline`/`idle`. | It currently sends an immediate status snapshot after `CONNECTED`. | Treating initial snapshot as a frontend-corrected passive value. |
| `autobyteus-server-ts/src/services/agent-streaming/team-runtime-status-snapshot-service.ts` | File | Team initial snapshot owner | Emit backend-authoritative member/team status snapshots with canonical route/path identity; accepted member/subteam startup snapshots must be `initializing`. | Existing team snapshot source. | Snapshots identified only by display names or requiring frontend status invention. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts` | File | Mixed runtime | Route participant-shaped delivery requests. For nested representative selectors, resolve the executable top-level subteam handle while publishing actual leaf sender/receiver participants; for parent-boundary descriptors, delegate through the bridge instead of resolving locally; include route/path identity in member status snapshots. | Parent-to-representative delivery must publish receiver `BuildSquad/review_lead`; parent-boundary reports must preserve sender `BuildSquad/review_lead` and deliver to parent recipients; status snapshots must route strictly. | Parent communication projections that lose nested identity or status snapshots that rely on names. |
| `autobyteus-web/services/agentStreaming/handlers/externalUserMessageHandler.ts` | File | Frontend live input handler | Upsert `EXTERNAL_USER_MESSAGE` into leaf conversation by backend message identity/dedupe key. | Existing handler for user-visible input messages. | Team communication projection or child route guessing. |
| `autobyteus-web/services/runHydration/runProjectionConversation.ts` | File | Frontend projection hydration | Convert deduped projection rows into conversation messages; defensively dedupe stale rows. | Existing projection-to-conversation owner. | Backend projection source selection. |
| `autobyteus-web/composables/useTeamMemberPresentation.ts` | File | Frontend presentation policy | Compute primary membership label, secondary route breadcrumb, definition subtitle, initials/avatar inputs. | Existing shared presentation composable. | Component-specific hidden label precedence. |
| `autobyteus-web/stores/teamCommunicationStore.ts` | File | Frontend communication read model | Store nested sender/receiver participant identities plus represented-subteam metadata. | Existing communication store. | Grouping only by run ID/name or dropping representation context. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-team-execution/domain` | Main-Line Domain-Control | Yes | Low | Holds cross-backend team run contracts. |
| `agent-team-execution/services` | Main-Line Domain-Control / Off-Spine planning | Yes | Medium | Planner and metadata mapper are service concerns but distinct owners. |
| `agent-team-execution/backends/mixed/members` | Main-Line Domain-Control | Yes | Low | Structural depth needed because member handles become the key mixed runtime abstraction. |
| `agent-team-execution/backends/mixed/events` | Off-Spine Concern | Yes | Low | Event bridge serves manager; not on command spine. |
| `run-history/store` | Persistence-Provider | Yes | Low | Durable schema only. |
| `autobyteus-web/stores` | Frontend read-model/control | Yes | Medium | Active context and history stores own UI state/read models; avoid component-local topology reconstruction. |
| `autobyteus-web/utils` | Frontend off-spine topology/config helpers | Yes | Medium | Tree construction and leaf derivation are reusable helpers serving stores. |
| `autobyteus-web/components/workspace` | Frontend presentation | Yes | Medium | Components render store-owned recursive topology and emit route-key selections. |
| `autobyteus-web/services/agentStreaming` | Frontend transport/event adapter | Yes | Medium | WebSocket payload identity is adapted here, not in display components. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Nested route identity | `['EngineeringDept', 'CodeReviewTeam', 'Reviewer'] -> 'EngineeringDept/CodeReviewTeam/Reviewer'` | Bare `Reviewer` as global identity. | Multiple departments may have a `Reviewer`. |
| Member-handle boundary | `MixedTeamManager -> MixedTeamMemberHandle.postMessage()` | `if (member.refType === 'agent_team') { ... } else { agentRun... }` repeated in every command. | Keeps lifecycle/routing centralized. |
| Parent communication to subteam representative | Parent `send_message_to('Reviewer')` where `Reviewer` represents `CodeReviewTeam` -> descriptor target `CodeReviewTeam/Reviewer` -> subteam handle strips prefix -> child coordinator. | Parent exposes abstract `CodeReviewTeam` as an agent-like recipient or posts directly to a child leaf without subteam-boundary metadata. | Preserves department/team boundary while using the responsible coordinator as the visible communication member. |
| Event attribution | `sourcePath: ['CodeReviewTeam', 'Reviewer']`, with transport deriving `source_route_key: 'CodeReviewTeam/Reviewer'` if needed. | `subTeamNodeName: 'Reviewer'` as authoritative identity or no path. | Distinguishes subteam path from leaf member identity. |
| Frontend workspace tree | `Parent Team -> BuildSquad [team] -> BuildSquad/review_lead` | `Parent Team -> review_lead` as a parent-level row. | Shows the addressed subteam boundary. |
| Frontend subteam focus | Selecting `BuildSquad` opens group panel and composer targets `BuildSquad`. | Try to find `AgentContext` for `BuildSquad` and fail/hide composer. | Subteam is a selectable team member, not a leaf agent. |
| Backend-owned startup status | Backend accepts send/start and snapshots/emits `initializing`; frontend renders it; runtime event then moves to `running`; completion moves to `idle`/done. | Frontend sets `initializing` locally while backend snapshot still says `offline`, producing `offline -> initializing -> offline`. | This is the delivery-blocking status ownership regression. |
| Provider status projection | Provider `bootstrapping`/`starting` becomes public `initializing` at backend adapter edge. | Frontend accepts raw `bootstrapping` as a public status, or backend drops it to fallback `offline`. | Keeps public API clean without losing startup UX. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Continue flattening nested teams into leaf agents for mixed runs | Existing services/tests already do this. | Rejected | Use recursive topology and subteam member handles. |
| Add optional subteam fields onto agent `TeamMemberRunConfig` | Minimizes compile changes. | Rejected | Use discriminated union so agent/team fields do not overlap. |
| Keep `subTeamNodeName` as authoritative nested identity | Existing AutoByteus backend uses it. | Rejected as authoritative | Replace with path-based source identity; derive any one-name display only at transport edge if absolutely necessary. |
| Use global `AgentTeamRunManager` as the child subteam registry | Easy reuse. | Rejected for internal members | Use mixed-owned child factory/handles; parent owns internal child lifecycle and metadata. |
| Runtime restore/parser migrates or recovers old flat team metadata inline | Avoids a separate migration subsystem. | Rejected | Runtime restore/parsers stay current-schema-only; known old persisted data is converted by registered app data migration before normal hydration. |
| Secret best-effort startup migration with only logs | Faster to implement. | Rejected | Record app data migration status in the database and expose Settings -> Server -> Migrations with retry/details. |
| Keep frontend flatten-only member display while backend is recursive | Minimizes frontend changes. | Rejected | Use recursive `TeamMemberNode` tree and derived leaf indexes. The seeded browser validation proves flattening is user-visible wrong. |
| Keep frontend flat `runVersion`/`memberMetadata` parser as current schema | Avoids frontend history type updates. | Rejected | Parse/display canonical `memberTree`; do not add current-schema fallback for historical flat data. |
| Derive live child coordinator prompts from `TEAM_COMMUNICATION_MESSAGE` on the frontend | Smaller local patch. | Rejected | Backend `MEMBER_INPUT` event owns recipient leaf transcript because only backend knows actual child target and recipient-visible prompt. |
| Hide duplicate projection rows only in Vue components | Quick visual fix. | Rejected | Backend projection query must return deduped logical messages; frontend hydration dedupe is only defensive. |
| Use agent definition display name as primary active row label | Looks friendlier for simple flat runs. | Rejected for nested team rows | Team membership label is primary; agent definition display name is secondary metadata so active/history identity stays stable. |

## Derived Layering (If Useful)

- Transport layer: GraphQL/WebSocket/external channel call `TeamRunService` or consume `TeamRunEvent`.
- Frontend transport/read-model layer: `TeamStreamingService`, run-history metadata parser, and team communication store adapt canonical path/route identity for UI.
- Team run orchestration layer: `TeamRunService`, topology planner, metadata mapper.
- Runtime layer: `AgentTeamRunManager`, `MixedTeamRunBackend`, `MixedTeamManager`, member handles.
- Provider/runtime adapter layer: existing `AgentRunManager` and provider backends for leaf agents.

Layering is explanatory only; ownership boundaries above are authoritative.

## Migration / Refactor Sequence

1. Add domain identity/config/context/event types for recursive members, source path, and `TeamMemberSelector`.
2. Update public command signatures across `TeamRun`, `TeamRunBackend`, and `TeamManager` to accept path/route `TeamMemberSelector`; add edge adapter helpers that parse explicit path/route payload fields and reject scalar string/name/id payloads.
3. Add `TeamDefinitionTopologyPlanner` and tests for nested tree planning, route paths, duplicate names, missing refs, cycle rejection, and coordinator-agent invariant.
4. Update `TeamRunService` to use topology planning for create-run and to select `TeamBackendKind.MIXED` when topology contains subteams.
5. Update mixed run context/factory to create recursive mixed contexts and pass them to `MixedTeamManager`.
6. Add mixed member handle contract, agent handle, subteam handle, registry, child run factory, and event bridge.
7. Refactor `MixedTeamManager` to depend on member handles and remove direct `AgentRun` maps/agent-only command paths.
8. Update member-team context, inter-agent delivery DTOs/builders, and team communication projection/service to use participant-shaped descriptors, absolute-route selector/path identities, and represented-subteam communication events.
9. Update metadata types/store/mapper to canonical recursive `TeamRunMetadata` with no version suffix/field, delete/replace old flat metadata restore code, keep runtime readers current-schema-only with typed legacy-unmigrated diagnostics, and update flattener-based projection consumers to use canonical `sourcePath` with derived transport aliases.
9a. Add the app data migration framework: Prisma `AppDataMigrationRecord`, registry, runner, status repository, startup execution after Prisma schema migrations, GraphQL status/retry API, and `20260517_team_run_metadata_member_tree` conversion with backup/atomic write. Implement the manual retry/concurrency spine (`runAppDataMigration(id)` -> runner lock/stale RUNNING handling -> DB summary/log -> frontend refresh). Update history/sidebar hydration and direct restore/open handling to skip or friendly-handle unmigrated legacy diagnostics without raw UI errors or runtime start.
10. Update frontend topology/types: `TeamMemberNode`, `AgentTeamContext.memberTree`, route-key member-node indexes, leaf agent context map, and `focusedMemberRouteKey`.
11. Update frontend draft/launch path to build recursive definition trees and leaf launch configs keyed by canonical nested route keys; remove flat child-name override lookup.
12. Update frontend run history/restore parsing and read models to consume `metadata.memberTree` and render nested member rows recursively.
13. Update frontend workspace/team components for subteam rows, subteam focus/group cards, grid/spotlight mixed node rendering, and composer targeting by route/path.
14. Add backend `MEMBER_INPUT` event/payload generation for accepted recipient-side inputs, including parent-to-representative delivery trace IDs and source-path recipient identity; map it to WebSocket `EXTERNAL_USER_MESSAGE`.
15. Update frontend streaming handlers so `EXTERNAL_USER_MESSAGE` routes by source path/route key and upserts by message ID/dedupe key; do not derive leaf prompts from communication messages.
16. Add backend run-projection semantic dedupe at `AgentRunViewProjectionService` merge time and defensive frontend dedupe in `runProjectionConversation`.
17. Centralize frontend member labels in `useTeamMemberPresentation` and update active/history row builders to use membership labels as primary.
18. Update frontend streaming, tool approval, activity, and communication stores to resolve/display canonical source path, member route key, and participant kind/path/route.
19. Add communication recipient descriptors, representative roster projection, and bridge routing for child-to-parent reports; update tool handlers to resolve against `communicationRecipients` rather than structural `members`; update runtime instructions to render a team membership roster manifest from those descriptors; update command/protocol adapters and E2E helpers to remove scalar target aliases and use path/route selector fields only; update parent-to-subteam representative delivery to target coordinator routes; and update parent communication event publishing to use nested sender/receiver paths when participants are representatives.
20. Update tests that currently assert nested definitions flatten for backend or frontend to either target non-nested flat behavior or assert recursive mixed nested behavior.
21. Run focused backend unit/integration tests, frontend store/component tests, then the seeded full-stack browser validations from `fullstack-nested-team-ui-validation-failure.md` and `fullstack-nested-team-live-child-transcript-validation-failure.md`; run live provider E2E only after environment setup is complete.

## Key Tradeoffs

- Recursive metadata is a larger change than storing child runs globally, but it keeps nested teams owned by the parent run and avoids top-level active/history clutter.
- Choosing mixed for any nested definition may route same-runtime nested teams away from existing Codex/Claude team managers, but that matches the product direction that mixed is the superset manager.
- Path-based identity is required for organization-like structures where departments repeat role names; public runtime commands do not accept bare-name shortcuts.
- Supporting controlled child-to-immediate-parent reporting is more complex than top-down-only delegation, but it is required for realistic delegation. The design keeps the boundary clean by using explicit parent-boundary recipient descriptors and rejecting arbitrary cross-level/global messaging.
- Adding an app data migration subsystem is more work than allowing the runtime parser to read both old and new metadata, but it keeps the runtime model clean while making real-user upgrades robust and observable. Migration code is isolated, recorded, and retryable instead of becoming permanent compatibility logic.

## Risks

- Many current consumers assume flat `memberConfigs` and flat `memberMetadata`; implementation must update all type errors rather than patching with casts.
- Existing run history restore for old flat metadata should normally be preceded by the app data migration. Do not infer topology or add runtime dual-schema compatibility branches; if migration fails, history/sidebar must degrade gracefully and direct restore should show a friendly legacy-unmigrated message pointing to Settings -> Server -> Migrations.
- Stream clients need updates to consume canonical `sourcePath` or derived route aliases instead of a single subteam name.
- Tool-approval clients must round-trip nested source path/route identity from approval-request event to approval command.
- Frontend currently has tests and types that assert flat nested display; those must be replaced, not preserved as compatibility coverage.
- Data migration failures must be visible in the migration screen and release validation; hidden startup warnings are insufficient because existing users may otherwise receive a visually broken app.
- Migration status uses the application database while team metadata lives in file storage; implementation must keep these two stores coordinated but not make normal runtime history depend on migration logs for current-schema metadata.
- Subteam focus must not accidentally call leaf-only projection APIs for `agent_team` route keys; group nodes require separate rendering and communication/activity summaries.
- Activity and team communication display can become confusing if sender/receiver participant paths are not shown as breadcrumbs.
- Upward reporting can become unsafe if implemented by flattening parent members into child teammates. Keep parent-boundary recipients as explicit scoped descriptors and reject non-exposed targets.
- Live transcript and communication projection can become duplicated/confusing if parent communication events are reused as child leaf transcript messages. Keep `COMMUNICATION` and `MEMBER_INPUT` separate.
- Direct leaf sends can duplicate optimistic frontend user messages if backend member-input echoes are appended blindly. Upsert by `message_id`/`dedupe_key`.
- Projection dedupe fallback keys can accidentally collapse intentionally repeated identical messages if they are too broad. Only use content/timestamp-null fallback to collapse same-merge-batch/adjacent timestamp-null duplicates unless a stable message ID exists.
- Active/history row identity can drift again if components bypass `useTeamMemberPresentation`.
- Seeded full-stack browser validation is required because backend-only E2E passed while the UI was still wrong.
- Validation cannot be fully trusted until dependencies are installed in the dedicated worktree and focused tests run.

## Guidance For Implementation

- Start with domain types and topology planner tests before touching `MixedTeamManager`.
- Do not implement nested support by adding subteam conditionals directly to every current `AgentRun` operation.
- Treat `memberRouteKey` as derived from `memberPath`; avoid independent parallel identities.
- Treat `sourcePath` as the canonical event identity; derive `source_route_key`, `agent_name`, and any legacy `sub_team_node_name` only in transport/projection code.
- For live inbound prompts, implement backend `MEMBER_INPUT` first; do not patch the frontend by converting `TEAM_COMMUNICATION_MESSAGE` into child leaf user messages.
- Keep parent team communication and child leaf transcript linked by IDs but represented as separate records.
- Put projection duplicate removal in backend projection merge/normalization before GraphQL returns; frontend projection hydration should only defend against stale payloads.
- Use `useTeamMemberPresentation` for active and history labels; do not prefer `memberContext.config.agentDefinitionName` as the primary label for nested member rows.
- Keep child team creation internal to mixed member handles unless product explicitly wants child runs to become top-level active/history runs.
- Use AutoByteus-ts `TeamManager`, `TeamEventBridge`, and `SubTeamShutdownStep` as behavior references, but implement against server `AgentRun`/`TeamRun` abstractions.
- Add tests around the actual user story: parent team has a `CodeReviewTeam` member; parent agent sends work to that member; child team coordinator receives it; child leaf events appear under `sourcePath: ['CodeReviewTeam', '<leaf>']`.
- On the frontend, implement the recursive `TeamMemberNode` tree before patching components; components should consume store getters rather than each computing flat members.
- Rename focus semantics to route-key terminology (`focusedMemberRouteKey`) as part of the frontend change; do not keep `focusedMemberName` as the authoritative nested selector.
- Keep leaf `AgentContext` hydration strictly for `agent` nodes; `agent_team` nodes need a group/focus view and should not call `getTeamMemberRunProjection`.
- Add a browser validation assertion for the seeded `Nested Mixed Runtime Delivery Team -> BuildSquad -> review_lead/qa_specialist` tree.
- Add browser/API assertions that focusing `BuildSquad/review_lead` live shows the inbound `You received...program_manager` prompt before the reply; `getTeamMemberRunProjection` returns no duplicate `ts: null` copies; active and history labels match the membership-label policy.
