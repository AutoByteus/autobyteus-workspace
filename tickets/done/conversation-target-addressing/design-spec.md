# Design Spec — Conversation Target Addressing For Runtime Task Executions

Canonical artifact path: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/tickets/in-progress/conversation-target-addressing/design-spec.md`

## Current-State Read

The approved requirements and investigation show that the current system already has a path-shaped structural addressing model, but ordinary user chat cannot address runtime task participants.

Current frontend path:

1. `TeamWorkspaceView.vue` asks `resolveTeamUserMessageTarget(...)` for the focused chat target.
2. `autobyteus-web/utils/teamUserMessageTarget.ts` returns only a structural `memberRouteKey` target for `leaf_agent` or `subteam`.
3. That resolver deliberately rejects task-team roots and task-team child projections with `task_execution_focus`.
4. `agentTeamRunStore.sendMessageToFocusedMember(...)` uses the returned `memberRouteKey` as several different things: upload owner key, local optimistic conversation key, dedupe key component, and websocket routing target.
5. `TeamStreamingService.sendMessage(...)` serializes only `target_member_route_key`.

Current backend path:

1. `AgentTeamStreamHandler.handleSendMessage(...)` receives `SEND_MESSAGE` on a websocket session already bound to one `TeamRun`.
2. `team-command-selector-parser.ts` accepts only `target_member_path` / `targetMemberPath` or `target_member_route_key` / `targetMemberRouteKey` for `SEND_MESSAGE`.
3. The parser rejects scalar name/id selectors; that invariant is correct and must remain.
4. The handler builds an `AgentInputUserMessage` and calls `teamRun.postMessage(userMessage, targetSelector)`.
5. `TeamRun` is the authoritative public runtime boundary. It forwards to `TeamRunBackend` / `MixedTeamManager`.
6. `MixedTeamManager` already has partial primitives:
   - `postMessage(message, selector, targetMemberRunId)` can reach a concrete task-agent instance when supplied a logical member selector and `targetMemberRunId`.
   - `postMessageToTaskTeamInstance(logicalTeamRouteKey, taskTeamRunId, message)` can reach a concrete task-team root/default target.
   - `MixedTaskTeamMemberHandle.ensureReady()` owns entering/restoring the child `TeamRun` for a task-team instance.
   - `MixedSubTeamMemberHandle.ensureReady()` owns entering/restoring the child `TeamRun` for a structural subteam.

Current structural selector reality:

- `memberRouteKey` and `memberPath` are equivalent structural member selectors. `memberRouteKey` is the compact slash-string form of `memberPath`.
- Deep structural members already appear as route keys such as `BuildSquad/review_lead` or paths such as `['BuildSquad', 'review_lead']`.
- Runtime task run ids are not structural member names. They need typed path segments, not string overloading.

Current ownership / fragmentation problems:

API/E2E live `open_tab` validation later exposed a validation-enabling no-regression gap outside the conversation-address router itself: a real AutoByteus coordinator could advertise `BuildSquad` as a team `delegate_task` target, but tool execution could not resolve the same team target because AutoByteus native `customData.teamContext.members` did not preserve `agent_team` descriptor metadata. This does not invalidate the recursive address design, but it must be repaired or an honest live task-team-child click/send cannot be completed.

- There is no owner for interpreting a recursive conversation target across structural and runtime boundaries.
- Frontend target resolution is route-only and blocks displayed runtime participants even when enough identity is present.
- The websocket protocol has only flat structural selector fields.
- Existing backend primitives are split by task-agent and task-team special methods, but no single conversation-address router composes them.
- Current frontend local message placement uses `memberRouteKey` as both a backend route and a local/projection key, which becomes ambiguous for runtime paths.

Constraints the target design must respect:

- The websocket session's `TeamRun` remains the address root and is authoritative.
- Existing flat structural selector payloads must normalize into the new model for structural chat only.
- Scalar/name-only selectors remain invalid.
- Ordinary chat must remain separate from task lifecycle commands, tool approvals, interrupts, settlement, review, and result submission.
- Runtime routing must not bypass `TeamRun`, `MixedTaskTeamMemberHandle`, or `MixedSubTeamMemberHandle` boundaries.

## Intended Change

Introduce a unified `ConversationTargetAddress` for ordinary human/user `SEND_MESSAGE` routing in team workspaces.

The target is a typed recursive participant path from the active websocket-bound parent `TeamRun`:

```ts
type ConversationTargetAddress = {
  /** Optional validation/debug metadata only. The websocket session remains authoritative. */
  parentTeamRunId?: string | null;
  segments: ConversationTargetSegment[];
};

type ConversationTargetSegment =
  | { kind: 'member'; memberRouteKey?: string; memberPath?: string[] }
  | { kind: 'task_team'; taskTeamRunId: string }
  | { kind: 'task_agent'; taskAgentRunId: string };
```

Canonical websocket payload shape emitted by the frontend:

```json
{
  "type": "SEND_MESSAGE",
  "payload": {
    "content": "hello",
    "conversation_target_address": {
      "segments": [
        { "kind": "member", "member_route_key": "SoftwareEngineeringTeam" },
        { "kind": "task_team", "task_team_run_id": "task-team-run-1" },
        { "kind": "member", "member_route_key": "solution_designer" },
        { "kind": "task_agent", "task_agent_run_id": "task-agent-run-2" }
      ]
    }
  }
}
```

Interpretation rules:

- Start at the websocket-bound parent `TeamRun`.
- `member` selects a structural member in the current team scope using route key or path. Route key/path are equivalent member selector forms.
- `task_team` selects a concrete delegated task-team execution under the previously selected structural team member. Terminal `task_team` sends to that child team run's default/coordinator target. Non-terminal `task_team` enters that child `TeamRun` and continues relative to its scope.
- `task_agent` selects a concrete delegated task-agent execution under the previously selected structural agent member. It is terminal.
- Invalid segment order, missing ids, inactive runs, stale run ids, route mismatch, unknown kinds, and ambiguous payloads fail as invalid targets. No structural fallback is allowed after an invalid runtime target.

Example addresses:

```ts
// Existing structural nested member.
{ segments: [
  { kind: 'member', memberRouteKey: 'BuildSquad/review_lead' },
] }

// Task-team root/default target.
{ segments: [
  { kind: 'member', memberRouteKey: 'SoftwareEngineeringTeam' },
  { kind: 'task_team', taskTeamRunId: 'task-team-run-1' },
] }

// Member inside that exact task-team run.
{ segments: [
  { kind: 'member', memberRouteKey: 'SoftwareEngineeringTeam' },
  { kind: 'task_team', taskTeamRunId: 'task-team-run-1' },
  { kind: 'member', memberRouteKey: 'solution_designer' },
] }

// Task-agent under that member inside that exact task-team run.
{ segments: [
  { kind: 'member', memberRouteKey: 'SoftwareEngineeringTeam' },
  { kind: 'task_team', taskTeamRunId: 'task-team-run-1' },
  { kind: 'member', memberRouteKey: 'solution_designer' },
  { kind: 'task_agent', taskAgentRunId: 'task-agent-run-2' },
] }
```

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature + behavior change + targeted refactor.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant + Boundary Or Ownership Issue + Shared Structure Looseness.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes.
- Evidence:
  - Structural addressing is already a path (`memberRouteKey` / `memberPath`), but runtime participants are displayed with separate projection metadata and then blocked from chat.
  - `TeamStreamingService.sendMessage` and `AgentTeamStreamHandler.handleSendMessage` only understand flat structural selectors.
  - Backend task-agent/task-team routing primitives exist, but the handler should not combine them directly because `TeamRun` is the authoritative boundary.
  - `memberRouteKey` is currently reused for routing, local conversation placement, upload ownership, and dedupe identity. Runtime addresses need a typed route plus a separate stable local target key.
- Design response:
  - Create one recursive address model and one backend conversation-address routing owner behind `TeamRun`.
  - Replace route-only frontend target resolution with address construction from focused node/projection metadata.
  - Keep structural flat selectors as parser-level normalization into a one-segment address, not as a second routing path.
  - Use explicit local `conversationTargetKey(address)` on the frontend for optimistic/local concerns instead of overloading `memberRouteKey`.
- Refactor rationale:
  - Adding task-agent and task-team special cases to `teamUserMessageTarget.ts`, `TeamStreamingService`, and the websocket handler would duplicate routing policy and hide the real recursive participant tree.
  - A fixed five-kind union would encode examples, not the system reality. The correct invariant is a typed path.
- Intentional deferrals and residual risk, if any:
  - Task lifecycle commands and tool approval targets are intentionally left on their current command-specific selector model. Reusing `ConversationTargetAddress` for those commands may be a future design, but it is out of scope because ordinary chat must not alter lifecycle state.
  - If context-file upload owner endpoint names remain `memberRouteKey`, treat the value as an opaque frontend upload owner key for this ticket; a wider upload API rename is not required for correct routing. The store-level variable should still be renamed to `conversationTargetKey` / `targetUploadKey` to avoid semantic leakage.
- Design-impact amendment after live `open_tab` API/E2E:
  - Classification: narrow validation-enabling no-regression fix, not a replacement for the conversation-address model.
  - Decision: supported live task-team projection creation is in scope because AC-006 through AC-010 and the user-requested UI click-through require a real projection. The ticket does not require every runtime family to expose `delegate_task`; Codex app-server non-exposure is not a task blocker by itself. AutoByteus native runtimes that do expose and advertise `delegate_task` team targets must preserve typed team descriptors into tool execution.
  - Refactor response: extend/reuse the existing task-delegation context mapping so AutoByteus native `customData.teamContext.members` carries the same semantic member/team identity as `buildTaskDelegationToolContextFromMemberTeamContext`, including `agent_team` metadata and ingress identity.

## Terminology

- `ConversationTargetAddress`: the normalized typed path for ordinary user chat routing inside a websocket-bound `TeamRun`.
- `ConversationTargetSegment`: one typed path step: `member`, `task_team`, or `task_agent`.
- `Member selector`: existing structural `TeamMemberSelector`, represented as route key or path.
- `Runtime segment`: a task-run-id segment whose kind tells the router how to interpret the id.
- `Conversation target key`: frontend-only stable opaque key derived from the full address for local drafts, upload ownership, dedupe keys, and optimistic placement. It is not a backend route string.

## Design Reading Order

Read this design from abstract to concrete:

1. data-flow spines and ownership boundaries;
2. address model and parser normalization;
3. backend recursive routing through `TeamRun` and mixed backend handles;
4. frontend address construction and composer behavior;
5. file responsibilities and migration sequence.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility wrappers or dual routing paths for replaced behavior.`
- Required action:
  - Remove the earlier fixed-kind address concept from requirements/design thinking. Do not implement `task_team_member`, `member_task_agent`, or similar fixed target kinds.
  - Remove route-only chat target resolution as the authoritative frontend model.
  - Remove `task_execution_focus` rejection for runtime projection nodes that can produce a valid `ConversationTargetAddress`.
  - Do not encode runtime run ids into `target_member_route_key` slash strings.
- Compatibility boundary:
  - Existing flat structural selector payloads are still accepted because they are the existing structural input contract. They are immediately normalized to `ConversationTargetAddress` at the parser boundary and do not become a second internal route.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Focused team workspace user send | Concrete structural member, task-agent run, or task-team child/default runtime | `TeamRun` with `MixedConversationTargetRouter` behind the backend boundary | Main in-scope behavior: ordinary chat delivery to any typed participant path. |
| DS-002 | Primary End-to-End / Compatibility Input | Existing flat structural `SEND_MESSAGE` payload | Same `TeamRun` conversation-address routing boundary | `TeamConversationTargetAddressParser` | Preserves existing structural chat while avoiding dual internal routing. |
| DS-003 | Bounded Local | Normalized address segments | Exact backend delivery call or invalid-target result | `MixedConversationTargetRouter` | Segment traversal is the local routing policy that must have one owner. |
| DS-004 | Return-Event | Target member/task runtime event | Frontend projection/conversation updates | `TeamRun` / existing event stream projection pipeline | Delivery must remain observable through existing team stream events and projection lifecycle. |
| DS-005 | Bounded Local | Focused `TeamMemberNode` metadata | `ConversationTargetAddress` + local target key | Frontend conversation target resolver | Frontend must derive addresses from displayed participant reality without backend route-string overloading. |

## Primary Execution Spine(s)

DS-001:

`TeamWorkspaceView / AgentUserInputForm -> ConversationTargetAddressResolver -> agentTeamRunStore -> TeamStreamingService -> AgentTeamStreamHandler -> TeamRun.postMessageToConversationTarget -> MixedConversationTargetRouter -> member/task runtime`

DS-002:

`Existing SEND_MESSAGE flat structural selector -> TeamConversationTargetAddressParser -> TeamRun.postMessageToConversationTarget -> MixedConversationTargetRouter -> structural member/subteam runtime`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The focused frontend node is resolved into a typed address. The store uses the address for routing payload and a derived local key for local concerns. The websocket handler parses the address and delegates to `TeamRun`. The mixed backend router traverses structural members and runtime task segments through existing member/task registries and child-run handles. | Focused node, address resolver, stream handler, `TeamRun`, mixed router, member/task runtime | `TeamRun` public boundary; `MixedConversationTargetRouter` owns mixed traversal behind it | Payload serialization, local target key, parser validation, context-file attachment partitioning |
| DS-002 | Old structural route/path payloads are accepted only at the parser boundary. They become `segments: [{ kind: 'member', ... }]` and then follow the same backend path as new addresses. | Flat selector payload, parser, `TeamRun`, mixed router | `TeamConversationTargetAddressParser` for normalization; `TeamRun` for delivery | Scalar selector rejection, ambiguity rejection |
| DS-003 | The router consumes a normalized segment list. It selects a structural member in the current team scope, optionally enters structural child teams or concrete task-team child runs, and delivers to terminal task-agent/task-team/member targets. Invalid order or mismatches return invalid-target results. | Segment cursor, selected structural member, task-agent registry, task-team registry, child `TeamRun` | `MixedConversationTargetRouter` | Existing registries/handles, selector normalization helpers |
| DS-004 | Existing target runtimes emit events through `TeamRunBackend`. Events are prefixed/multiplexed as today and projected into frontend task-agent/task-team/child nodes and conversations. | Runtime event, backend event bridge, `TeamRun`, websocket mapper, frontend projection pipeline | Existing `TeamRun` event stream owners | Projection cleanup, status overlays, local dedupe reconciliation |
| DS-005 | The frontend target resolver converts focused node metadata into a canonical address and a local target key. Runtime projection nodes either carry full segment metadata or are reconstructed from one-level fields. Composer visibility is based on addressability. | `TeamMemberNode`, address resolver, local key builder | Frontend conversation target resolver | Display labels, optimistic placement, active-execution safety fallback |

## Spine Actors / Main-Line Nodes

- `TeamWorkspaceView` / `AgentUserInputForm`: initiating UI surface.
- `ConversationTargetAddressResolver`: frontend owner of focused-node-to-address conversion.
- `agentTeamRunStore.sendMessageToFocusedMember`: frontend send orchestrator and local side-effect coordinator.
- `TeamStreamingService`: websocket client facade and protocol serializer.
- `AgentTeamStreamHandler`: websocket transport entrypoint; parses payload, creates message, delegates to `TeamRun`.
- `TeamRun`: authoritative public runtime boundary for team chat.
- `TeamRunBackend` / `TeamManager`: backend interface surfaces that carry the address command behind `TeamRun`.
- `MixedConversationTargetRouter`: mixed backend owner for recursive structural/runtime path traversal.
- `MixedPersistentMemberRegistry`, `MixedTaskAgentInstanceRegistry`, `MixedTaskTeamInstanceRegistry`: existing owned mechanisms for concrete member/task delivery.
- `MixedSubTeamMemberHandle`, `MixedTaskTeamMemberHandle`: existing owned boundaries for entering child `TeamRun`s.

## Ownership Map

| Node | Owns |
| --- | --- |
| `ConversationTargetAddressResolver` | Frontend address construction, focused-node addressability decisions, local target key derivation, user-facing target reason. |
| `agentTeamRunStore.sendMessageToFocusedMember` | Send orchestration, temporary team launch/restore integration, attachment finalization, local optimistic placement using resolver output. |
| `TeamStreamingService` | Websocket message serialization/deserialization. It owns protocol shape, not address semantics. |
| `TeamConversationTargetAddressParser` | Transport payload normalization/validation for ordinary chat addresses; scalar rejection; parent-run mismatch validation. |
| `AgentTeamStreamHandler` | Transport command handling and `AgentInputUserMessage` creation. It is not the routing owner. |
| `TeamRun` | Authoritative public team-runtime boundary and team-level default/coordinator target behavior. Thin facade for backend traversal but still the boundary callers must use. |
| `TeamRunBackend` / `TeamManager` | Backend contract that lets concrete backends implement address routing without transport bypass. |
| `MixedConversationTargetRouter` | Recursive conversation address traversal through structural members, task-team runs, and task-agent runs inside mixed backend. |
| `MixedSubTeamMemberHandle` | Lifecycle/readiness/event-prefixing boundary for structural child `TeamRun`s. |
| `MixedTaskTeamMemberHandle` | Lifecycle/readiness/event-prefixing/directory binding boundary for concrete task-team child `TeamRun`s. |
| `MixedTaskAgentInstanceRegistry` | Exact task-agent run lookup/delivery under a logical member. |
| `MixedTaskTeamInstanceRegistry` | Exact task-team run lookup, mismatch validation, and handle lookup under a logical team. |

`TeamRun` is a public facade around backend internals, but it is also the authoritative boundary for callers above team execution. The websocket handler must depend on `TeamRun` only, not on `TeamRun` plus mixed registries.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `TeamStreamingService.sendMessage` | Frontend resolver + backend parser/router | Client websocket convenience and payload serialization | Segment validation/traversal policy. |
| `AgentTeamStreamHandler.handleSendMessage` | `TeamRun` / backend router | Websocket command entrypoint, content/context-file parsing, invalid-target error response | Runtime run lookup, mixed registry traversal, fallback routing. |
| `TeamRun.postMessageToConversationTarget` | Concrete `TeamRunBackend` / `MixedConversationTargetRouter` | Stable public team-runtime boundary | Mixed-backend registry details. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Fixed five-kind address draft (`member_task_agent`, `task_team_member`, etc.) | It special-cases examples instead of representing recursive participant reality. | `ConversationTargetAddress` segment list. | In This Change | Do not implement these names anywhere. |
| Route-only `TeamUserMessageTarget.memberRouteKey` as authoritative chat target | Cannot express typed runtime segments and overuses route strings. | `ConversationTargetAddressResolution.address` + `localTargetKey`. | In This Change | The existing file may be replaced or refactored, but callers should consume the new resolution shape. |
| `task_execution_focus` rejection for valid runtime projection focus | Runtime projections should be chat-addressable when identity is present. | Addressability-based resolver reasons. | In This Change | Keep explanatory rejection only for missing/stale identity. |
| `SEND_MESSAGE` internal routing by flat `TeamMemberSelector` only | Leaves no runtime segment interpretation point. | `TeamRun.postMessageToConversationTarget`. | In This Change | Flat selector parser remains only as normalization input. |
| Runtime ids encoded into `target_member_route_key` | Ambiguous and loses type/kind information. | Typed `task_team` / `task_agent` segments. | In This Change | Explicitly test this does not become the target strategy. |
| Store variables using `targetMemberRouteKey` for runtime local keys | Misleads implementation into treating runtime paths as member selectors. | `conversationTargetKey` / `localTargetKey` variable names. | In This Change | Wider upload endpoint rename can be deferred if value is opaque. |

## Return Or Event Spine(s) (If Applicable)

DS-004 return/event spine:

`Target AgentRun / TaskTeam child TeamRun -> Mixed backend event bridge -> TeamRunBackend multiplexing -> TeamRun subscription -> AgentTeamStreamHandler websocket mapper -> TeamStreamingService.handleMessage -> task projection / member conversation update`

This design does not replace the existing event projection pipeline. It relies on existing event identity fields (`member_route_key`, `source_path`, `task_agent_run_id`, `task_team_run_id`, `task_team_relative_member_route_key`, etc.) to keep runtime projections and local conversations updated after delivery.

The only required event-side adjustment is frontend dedupe/local placement: when a local optimistic user message used a `conversationTargetKey`, incoming projected messages must reconcile with the same message id/dedupe key regardless of whether the target was structural or runtime.

## Bounded Local / Internal Spines (If Applicable)

Parent owner: `MixedConversationTargetRouter`

`segments cursor -> resolve member in current team scope -> choose terminal delivery or child-scope entry -> existing registry/handle -> child TeamRun recursion or exact runtime post`

Why it matters: this is the core missing invariant. It must be local to the mixed backend, behind `TeamRun`, and must not be duplicated in the websocket handler or frontend.

Parent owner: `ConversationTargetAddressResolver`

`focused TeamMemberNode -> projection metadata/full stored segments -> normalized address -> localTargetKey + display reason`

Why it matters: composer visibility and payload shape must come from addressability, not from hard-coded projection rejection.

Parent owner: `TeamConversationTargetAddressParser`

`payload fields -> scalar/ambiguity checks -> nested address parse or flat structural normalization -> normalized domain address / invalid-target error`

Why it matters: parser compatibility is allowed only as immediate normalization; it must not create dual backend flows.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Payload alias parsing | DS-001, DS-002 | Parser | Accept snake_case canonical and bounded camelCase aliases, reject ambiguity | Existing protocol uses aliases in places | Handler becomes schema/routing blob. |
| Scalar selector rejection | DS-002 | Parser | Preserve no name-only target invariant | Avoid display-name routing ambiguity | Runtime router receives malformed identities. |
| Local target key derivation | DS-001, DS-005 | Frontend resolver/store | Stable key for uploads, dedupe, and optimistic local state | Avoid overloading `memberRouteKey` | Backend address strings leak into UI storage assumptions. |
| Composer label/context presentation | DS-005 | Team workspace UI | Explain runtime vs structural target | User clarity | Resolver starts owning display markup. |
| Existing projection event routing | DS-004 | Team streaming projection pipeline | Maintain task-agent/task-team node lifecycle and conversation updates | Avoid regressions | Address router would start owning frontend projection state. |
| Context file partition/finalization | DS-001 | Store/upload subsystem | Attach files/images to the outgoing user message | Existing send behavior | Streaming service starts owning upload lifecycle. |
| Invalid-target error messaging | DS-001, DS-002 | Parser/handler/backend router | Return deterministic invalid target results and websocket errors | User/developer debuggability | Invalid routing silently falls back. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Structural member selector normalization | `team-run-member-identity.ts` / `team-member-selector-payload-adapter.ts` | Reuse / Extend | Already owns route-key/path equivalence. | N/A |
| Websocket command parsing | `services/agent-streaming` parser files | Extend | Parser boundary already owns command payload normalization and invalid selector checks. | N/A |
| Public team-runtime command boundary | `TeamRun` / `TeamRunBackend` | Extend | Authoritative boundary for team chat and backend dispatch. | N/A |
| Mixed backend runtime routing | `backends/mixed` manager/registries/handles | Extend | Existing registries own task-agent/task-team handles and subteam child runs. | N/A |
| Frontend focus-to-target resolution | `autobyteus-web/utils/teamUserMessageTarget.ts` | Replace / Extend | Existing file has the right call sites but wrong route-only model. | Create a new `teamConversationTargetAddress.ts` if replacement is clearer than expanding the old name. |
| Frontend protocol typing | `protocol/messageTypes.ts` | Extend | Existing websocket protocol types should carry the new payload shape. | N/A |
| Task lifecycle/tool approval routing | Existing tool approval command path | Reuse unchanged | Commands are separate behaviors with command-specific semantics. | Do not create cross-command generic routing in this ticket. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend team workspace target resolution | Focused node -> address, local key, addressability reason | DS-001, DS-005 | UI/store | Extend / Rename | Prefer a new address-named utility while preserving call-site clarity. |
| Frontend team streaming protocol | `SEND_MESSAGE` payload type and serialization | DS-001 | `TeamStreamingService` | Extend | Emit canonical snake_case nested address. |
| Backend agent-streaming parser | Payload normalization into domain address | DS-001, DS-002 | `AgentTeamStreamHandler` | Extend / Add parser file | Keep handler thin. |
| Team execution domain | `ConversationTargetAddress` domain type and `TeamRun` public method | DS-001, DS-002 | `TeamRun` | Extend | Address type belongs with team execution domain, not transport. |
| Mixed backend conversation routing | Recursive segment traversal and exact delivery | DS-001, DS-003 | `MixedTeamManager` | Create New internal router | New owner is needed; registries stay focused on handle lookup/delivery. |
| Existing mixed registries/handles | Task-agent, task-team, structural subteam delivery/readiness | DS-003, DS-004 | Mixed router | Extend | Add child-address entry methods rather than exposing internals. |
| API/E2E/unit coverage | Parser, resolver, runtime exact delivery, UI composer visibility | All | Downstream QA | Extend | Coverage decisions belong to `api_e2e_engineer`, but design names required evidence. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/domain/conversation-target-address.ts` | Team execution domain | Domain address model | Define normalized address/segments, clone/normalize helpers, address-to-debug-string helpers | Shared by parser, `TeamRun`, backend interfaces, router | Uses `TeamMemberSelector` helpers. |
| `autobyteus-server-ts/src/services/agent-streaming/team-conversation-target-address-parser.ts` | Backend streaming parser | Transport normalization | Parse nested address, normalize flat selectors, reject scalar/ambiguous payloads, validate parent id | Keeps handler thin | Uses domain address helpers. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/conversation-target/mixed-conversation-target-router.ts` | Mixed backend | Recursive routing owner | Traverse normalized segments through persistent members, task-agent registry, task-team registry, child handles | One owner for segment traversal | Uses domain address helpers and registries. |
| `autobyteus-web/types/agent/ConversationTargetAddress.ts` | Frontend team types | Frontend protocol/domain mirror | Define frontend address and segment types | Prevent duplicate loose shapes | Shared by resolver and streaming protocol. |
| `autobyteus-web/utils/teamConversationTargetAddress.ts` | Frontend target resolution | Address resolver | Build address/local key from focused node; addressability reasons | Replaces route-only resolver semantics | Uses frontend address type. |
| `autobyteus-web/utils/teamUserMessageTarget.ts` | Frontend target resolution compatibility | Optional compatibility re-export / migration | Either remove or make it delegate to new address resolver where old callers still need `context/node` | Avoid churn if call sites exist | Uses new resolver, not vice versa. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Backend address/segment union | `domain/conversation-target-address.ts` | Team execution domain | Parser, `TeamRun`, backend interfaces, router all need one meaning | Yes | Yes | Kitchen-sink target for lifecycle/tool commands. |
| Frontend address/segment union | `types/agent/ConversationTargetAddress.ts` | Frontend team types | Resolver, protocol, store need one shape | Yes | Yes | UI projection node with unrelated optional fields. |
| Address serialization/local key derivation | `utils/teamConversationTargetAddress.ts` | Frontend target resolution | Store/upload/dedupe need stable target key | Yes | Yes | Backend routing authority. |
| Payload nested-address parsing | `team-conversation-target-address-parser.ts` | Backend streaming parser | Avoid duplicating alias handling in handler/tests | Yes | Yes | Runtime traversal owner. |
| Mixed segment traversal | `mixed-conversation-target-router.ts` | Mixed backend | Avoid duplicating task-agent/task-team/subteam traversal in manager/handler | Yes | Yes | Generic helper detached from mixed backend state. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ConversationTargetAddress.parentTeamRunId` | Yes, validation/debug only | Yes | Low | Document that websocket session is authoritative and reject/ignore mismatches per parser decision. |
| `ConversationTargetAddress.segments` | Yes, ordered path from active team run | Yes | Low | Require non-malformed typed segment objects. |
| `member` segment `memberRouteKey` / `memberPath` | Yes, two equivalent structural selector forms | Yes | Medium | Normalize to one `TeamMemberSelector` in backend domain; frontend may preserve route/path but should compute one local key. |
| `task_team` segment `taskTeamRunId` | Yes, concrete task-team execution id | Yes | Low | Must not be mixed into `memberRouteKey`. |
| `task_agent` segment `taskAgentRunId` | Yes, concrete task-agent execution id | Yes | Low | Must be terminal. |
| Frontend `conversationTargetKey` | Yes, opaque local key derived from full address | Yes | Medium | Keep separate from backend route strings; use clear variable names. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/domain/conversation-target-address.ts` | Team execution domain | Domain address model | Export `ConversationTargetAddress`, `ConversationTargetSegment`, normalized member segment helpers, segment clone/debug helpers, error builders if useful | Domain shape belongs with `TeamRun` and backend contracts | Reuses `TeamMemberSelector`. |
| `autobyteus-server-ts/src/services/agent-streaming/team-conversation-target-address-parser.ts` | Backend streaming parser | Parser/normalizer | Export `resolveSendMessageConversationTargetAddress(payload, sessionTeamRunId)` returning address or invalid reason | Isolates transport aliases and ambiguity checks | Uses domain address. |
| `autobyteus-server-ts/src/services/agent-streaming/team-command-selector-parser.ts` | Backend streaming parser | Existing command selector parser | Preserve scalar selector rejection and existing tool/interrupt parser; remove/replace `resolveSendMessageTargetSelector` call sites or make it private to new parser normalization | Avoid mixing chat address parsing with tool commands beyond shared scalar check | Uses existing selector adapter. |
| `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts` | Backend streaming transport | Websocket handler | Use new parser; send invalid-target errors; call `teamRun.postMessageToConversationTarget(userMessage, address)` | Handler remains transport boundary | Uses parser/domain address. |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts` | Team execution domain | Public runtime boundary | Add `postMessageToConversationTarget(message, address)`; keep existing `postMessage` for other internal/default structural callers if still needed | Strengthens authoritative boundary | Uses domain address. |
| `autobyteus-server-ts/src/agent-team-execution/backends/team-run-backend.ts` | Team execution backend interface | Backend contract | Add `postMessageToConversationTarget(message, address)` | Keeps `TeamRun` backend-agnostic | Uses domain address. |
| `autobyteus-server-ts/src/agent-team-execution/backends/team-manager.ts` | Team manager interface | Backend manager contract | Add `postMessageToConversationTarget(message, address)` | Mixed backend can implement routing behind manager | Uses domain address. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-run-backend.ts` | Mixed backend facade | Backend adapter | Forward address call to `MixedTeamManager` | Thin backend adapter | Uses domain address. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts` | Mixed backend | Mixed backend owner | Instantiate/call `MixedConversationTargetRouter`; keep existing task lifecycle methods separate | Manager composes registries but delegates segment policy | Uses router/address. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/conversation-target/mixed-conversation-target-router.ts` | Mixed backend conversation target | Recursive router | Segment traversal, validation, exact runtime dispatch, no fallback | One file owns routing policy | Uses address/selectors/registries. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-task-team-instance-registry.ts` | Mixed task-team registry | Task-team handle lookup | Add address-entry method such as `postMessageToConversationTarget(logicalTeamRouteKey, taskTeamRunId, remainingAddress, message)` | Registry already owns run-id/mismatch validation | Uses address. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-task-team-member-handle.ts` | Mixed task-team child handle | Child task-team run boundary | Add child-address method that `ensureReady()` then calls `childRun.postMessageToConversationTarget(message, remainingAddress)`; keep existing root default `postMessage` | Handle owns child run readiness and event binding | Uses address. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-sub-team-member-handle.ts` | Mixed structural subteam handle | Child structural team run boundary | Add child-address/selector entry method for nested structural member traversal through `childRun.postMessageToConversationTarget` | Avoid losing remaining path after top-level subteam | Uses address. |
| `autobyteus-web/types/agent/ConversationTargetAddress.ts` | Frontend team types | Address type | Export frontend address/segment types and maybe address resolution result types | Prevent loose ad hoc shapes | N/A |
| `autobyteus-web/types/agent/AgentTeamContext.ts` | Frontend team context | Projection metadata | Add optional `conversationTargetSegments?: ConversationTargetSegment[]` to `TeamMemberNodeBase` if chosen for nested runtime support | Runtime projections can carry canonical path stack | Uses frontend address type. |
| `autobyteus-web/utils/teamConversationTargetAddress.ts` | Frontend target resolution | Resolver | Build address/local key from focused node; normalize projection metadata; expose reason enum | New central owner | Uses address type. |
| `autobyteus-web/utils/teamUserMessageTarget.ts` | Frontend target resolution migration | Compatibility wrapper or removal | Delegate to new resolver for remaining callers or remove if no longer needed | Avoid stale route-only resolver | Uses new resolver. |
| `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts` | Frontend protocol types | Protocol typing | Add `ConversationTargetAddressPayload` and `SendMessagePayload.conversation_target_address` / optional camelCase alias typing | Protocol owns message schema | Uses frontend address type or payload mirror. |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | Frontend streaming facade | Serializer | Change `sendMessage` to accept address plus local identity; emit canonical `conversation_target_address` | Keeps transport serialization here | Uses address payload mapper. |
| `autobyteus-web/stores/agentTeamRunStore.ts` | Frontend send orchestration | Store action | Consume address resolver; use `localTargetKey` for upload/dedupe/local placement; send address to stream service | Store owns orchestration, not resolution | Uses resolver/address. |
| `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue` | Frontend team workspace | Composer UI | Show composer when resolver says addressable; label structural/runtime targets clearly | UI should not hard-code projection rejection | Uses resolver result. |
| `autobyteus-web/services/agentStreaming/teamTaskAgentContextProjection.ts` | Frontend projection | Task-agent projection metadata | Store `conversationTargetSegments` on task-agent projection nodes/contexts | Enables nested task-agent addresses | Uses frontend address type. |
| `autobyteus-web/services/agentStreaming/teamTaskTeamExecutionProjection.ts` | Frontend projection | Task-team root projection metadata | Store `conversationTargetSegments` for task-team root and clone children with inherited prefix | Enables nested task-team addresses | Uses frontend address type. |
| `autobyteus-web/services/agentStreaming/teamTaskTeamChildProjection.ts` | Frontend projection | Task-team child projection metadata | Store child segments: parent task-team prefix + relative member selector | Prevents relying on scoped UI route keys | Uses frontend address type. |

## Ownership Boundaries

- `TeamRun` is the only public runtime boundary that the websocket handler may call for team chat delivery.
- The websocket handler may parse and validate transport payloads, but it must not look up task-agent/task-team registries or child team runs.
- `MixedConversationTargetRouter` owns traversal policy, but it must use existing registries and handles instead of constructing child runs itself.
- `MixedTaskTeamMemberHandle` owns readiness/restoration/binding for task-team child `TeamRun`s. A router entering a task-team must go through the task-team registry/handle.
- `MixedSubTeamMemberHandle` owns readiness/restoration/event prefixing for structural child `TeamRun`s. A router entering a structural subteam must go through the persistent member handle.
- Frontend projection route keys like `<taskTeamRunId>/<relativeRouteKey>` are UI state keys only. They must not become backend routing addresses.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TeamRun.postMessageToConversationTarget` | `TeamRunBackend`, `TeamManager`, mixed router, registries | `AgentTeamStreamHandler`, future API handlers | Handler calls `MixedTaskAgentInstanceRegistry` or `MixedTaskTeamInstanceRegistry` directly | Add/adjust `TeamRun` method and backend interface. |
| `MixedTaskTeamInstanceRegistry` | Task-team handle map and route/run mismatch checks | `MixedConversationTargetRouter`, `MixedTeamManager` | Router reads active directory or child run directly by run id | Add registry method returning exact operation result or calling handle. |
| `MixedTaskTeamMemberHandle` | Child task-team `TeamRun` lifecycle/readiness/event binding | Task-team registry/router | Router creates/restores child task-team run itself | Add handle method that enters child address after `ensureReady()`. |
| `MixedSubTeamMemberHandle` | Structural child `TeamRun` lifecycle/readiness/event prefixing | Persistent registry/router | Router strips path and constructs child run directly | Add handle method for remaining address/selector. |
| `ConversationTargetAddressResolver` | Focused-node projection metadata interpretation | Store/UI | Store hand-builds task-team/task-agent segment arrays in multiple places | Extend resolver output. |
| `TeamConversationTargetAddressParser` | Transport aliases, parent validation, malformed payload rejection | Websocket handler | Handler manually checks segment field names/kinds | Extend parser result shape. |

## Dependency Rules

Allowed:

- Frontend UI/store may depend on frontend address resolver and address types.
- `TeamStreamingService` may depend on frontend address payload types/mappers.
- Backend parser may depend on domain `ConversationTargetAddress` and existing selector helpers.
- `AgentTeamStreamHandler` may depend on parser and `TeamRun` only for routing.
- `TeamRun` may depend on `TeamRunBackend` address method.
- `MixedTeamManager` may depend on `MixedConversationTargetRouter` and existing registries.
- `MixedConversationTargetRouter` may depend on mixed registries/handles and domain selector/address helpers.
- Task-team/subteam handles may call child `TeamRun.postMessageToConversationTarget` after they own readiness.

Forbidden:

- Do not use `target_member_route_key` to carry runtime task run ids or mixed runtime paths.
- Do not add task-agent/task-team routing branches to `AgentTeamStreamHandler` beyond parser delegation and `TeamRun` call.
- Do not let frontend projection UI route keys become backend route addresses.
- Do not keep separate backend routing flows for old structural selector and new runtime address; old flat selectors normalize to address first.
- Do not let `MixedConversationTargetRouter` bypass child-run handles or active-run lifecycle boundaries.
- Do not refactor task lifecycle/tool approval commands into ordinary chat address behavior in this ticket.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `TeamStreamingService.sendMessage(content, address, contextFiles, imageUrls, identity)` | User chat websocket send | Serialize ordinary user chat payload | `ConversationTargetAddress` | Replace `targetMemberRouteKey` parameter for chat. |
| `resolveTeamConversationTargetAddress(teamContext, options)` | Frontend focused chat target | Build address/local key/context/label from focused node | `TeamMemberNode` metadata -> address | Can support active-execution safety fallback only before address construction. |
| `resolveSendMessageConversationTargetAddress(payload, sessionTeamRunId)` | Backend `SEND_MESSAGE` target parse | Normalize nested address or flat structural selector | Nested address, or flat route/path selector | Reject scalar/ambiguous payloads. |
| `TeamRun.postMessageToConversationTarget(message, address)` | Team-run chat delivery | Public team-runtime address boundary | `ConversationTargetAddress` | Websocket handler calls this. |
| `TeamRunBackend.postMessageToConversationTarget(message, address)` | Backend team-run delivery contract | Backend-agnostic dispatch | `ConversationTargetAddress` | Implement in mixed backend. |
| `TeamManager.postMessageToConversationTarget(message, address)` | Concrete manager dispatch | Concrete backend routing entry | `ConversationTargetAddress` | Existing `postMessage` can remain for structural/default internal paths. |
| `MixedConversationTargetRouter.postMessage(message, address)` | Mixed recursive routing | Traverse segments and deliver | Normalized address | Internal to mixed backend. |
| `MixedTaskTeamInstanceRegistry.postMessageToConversationTarget(logicalTeamRouteKey, taskTeamRunId, remainingAddress, message)` | Task-team run selection | Validate run id/logical team match and enter handle | Logical team route + task-team run id + remaining address | If `remainingAddress` empty, use existing default root post. |
| `MixedTaskTeamMemberHandle.postMessageToConversationTarget(message, remainingAddress)` | Task-team child run boundary | Ensure child run and delegate to child `TeamRun` | Remaining address relative to child scope | Keeps child lifecycle encapsulated. |
| `MixedSubTeamMemberHandle.postMessageToConversationTarget(message, remainingAddress)` | Structural child run boundary | Ensure child run and delegate to child `TeamRun` | Remaining address relative to child scope | Needed for deep structural + runtime combinations. |

Rule application: no generic id-based method should guess whether an id is a member name, task-team run id, task-agent run id, or team run id. The segment kind supplies that meaning.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TeamStreamingService.sendMessage(..., address, ...)` | Yes | Yes | Low | Remove route-key positional parameter. |
| `TeamRun.postMessageToConversationTarget` | Yes | Yes | Low | Keep lifecycle commands separate. |
| `MixedConversationTargetRouter.postMessage` | Yes | Yes | Low | Keep router internal to mixed backend. |
| Existing `TeamRun.postMessage(message, selector, targetMemberRunId)` | Medium | Medium | Medium | Keep for existing structural/default/internal callers, but do not use for new websocket chat path once address method exists. |
| `ToolApprovalTarget` / approval commands | Yes for approval | Medium | Medium | Leave unchanged in this ticket; do not mix ordinary chat address semantics into approval. |
| Context file owner `memberRouteKey` parameter | Medium | No for runtime targets | Medium | Use local variable `targetUploadKey`/`conversationTargetKey`; wider API rename can be separate if needed. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Recursive user chat path | `ConversationTargetAddress` | Yes | Low | Use consistently for ordinary chat only. |
| Segment kind for structural member | `member` | Yes | Low | Reuse existing member selector semantics. |
| Segment kind for delegated task-team execution | `task_team` | Yes | Low | Run id field must be `taskTeamRunId`. |
| Segment kind for delegated task-agent execution | `task_agent` | Yes | Low | Run id field must be `taskAgentRunId`. |
| Backend router | `MixedConversationTargetRouter` | Yes | Low | Keep in mixed backend, not generic service. |
| Frontend resolver | `teamConversationTargetAddress.ts` / `resolveTeamConversationTargetAddress` | Yes | Low | Prefer this over expanding route-only `teamUserMessageTarget`. |
| `taskTeamRelativeMemberRouteKey` | Existing name is acceptable | Yes | Low | It means member selector relative to task-team scope; do not use as global backend route. |
| `memberRouteKey` used for local target keys | No when runtime | Medium | Rename store-level variables to `conversationTargetKey` / `targetUploadKey`. |

## Applied Patterns (If Any)

- Recursive router pattern inside one owner: `MixedConversationTargetRouter` owns the bounded local segment traversal loop. It is not a generic helper; it is attached to the mixed backend owner.
- Thin facade pattern: `TeamRun.postMessageToConversationTarget` is the public boundary. It should be thin but mandatory for callers above team runtime.
- Parser/normalizer boundary: `TeamConversationTargetAddressParser` converts transport aliases and legacy structural selectors into one normalized domain shape.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/domain/conversation-target-address.ts` | File | Team execution domain | Domain address model and normalization helpers | Address is a team execution subject, not just websocket transport | Payload alias parsing, frontend-only labels. |
| `autobyteus-server-ts/src/services/agent-streaming/team-conversation-target-address-parser.ts` | File | Streaming parser | `SEND_MESSAGE` address payload parsing/normalization | Existing websocket parser area | Mixed registry traversal. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/conversation-target/` | Folder | Mixed backend conversation routing | Optional folder for recursive router and small router-specific helpers/tests | This routing has meaningful structural depth and should not bloat `mixed-team-manager.ts` | Transport parsing, frontend projection logic. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/conversation-target/mixed-conversation-target-router.ts` | File | Mixed backend router | Segment traversal and exact dispatch | Keeps manager thin and traversal policy singular | Parser alias rules, lifecycle command behavior. |
| `autobyteus-web/types/agent/ConversationTargetAddress.ts` | File | Frontend team type | Address/segment/resolution support types | Shared by resolver/protocol/store | Backend-only validation helpers. |
| `autobyteus-web/utils/teamConversationTargetAddress.ts` | File | Frontend resolver | Focused node -> address/local key/reason | Existing utility area for team focused target logic | Websocket send orchestration. |
| `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts` | File | Frontend websocket protocol | Add address payload types to `SEND_MESSAGE` | Existing protocol schema file | Address construction from UI state. |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | File | Frontend websocket facade | Serialize address payload | Existing send facade | Addressability decisions. |
| `autobyteus-web/services/agentStreaming/teamTask*Projection.ts` | Files | Frontend projection owners | Carry or derive canonical segment prefixes for runtime projections | Existing owners of task projection metadata | Backend routing decisions. |

Folder note: The new backend router deserves a small `conversation-target/` folder under mixed backend because it has its own bounded local flow and may need focused tests/helpers. Keep it compact; do not create a generic `routing` or `helpers` folder.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-team-execution/domain` | Main-Line Domain-Control | Yes | Low | Domain address belongs beside `TeamRun` concepts. |
| `services/agent-streaming` | Transport | Yes | Medium | Parser is transport-normalization only; keep traversal out. |
| `backends/mixed/conversation-target` | Main-Line Domain-Control inside mixed backend | Yes | Low | Segment traversal is backend policy behind `TeamRun`. |
| `autobyteus-web/utils` target resolver | Off-Spine Concern serving UI/store | Yes | Low | Focused-node address construction is frontend concern. |
| `autobyteus-web/services/agentStreaming` projections | Return/Event projection | Yes | Medium | Add only address metadata/prefixes; do not move routing semantics here. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Runtime target payload | `segments: [{kind:'member', member_route_key:'Team'}, {kind:'task_team', task_team_run_id:'tt1'}, {kind:'member', member_route_key:'agent'}, {kind:'task_agent', task_agent_run_id:'ta2'}]` | `target_member_route_key: 'Team/tt1/agent/ta2'` | Run ids need typed segment meaning; route strings are structural only. |
| Old structural payload handling | `target_member_route_key: 'BuildSquad/review_lead'` -> parser normalizes to one `member` segment -> same router | Handler calls `teamRun.postMessage` for old payload and `postMessageToConversationTarget` for new payload | One internal route prevents drift. |
| Child task-team entry | Router -> `MixedTaskTeamInstanceRegistry` -> `MixedTaskTeamMemberHandle.ensureReady()` -> child `TeamRun.postMessageToConversationTarget(remainingAddress)` | Router fetches active child run from global directory and posts directly | Preserves child-run lifecycle/event binding boundary. |
| Frontend task-team child target | Store full/inherited segments or derive `[member logicalTeam, task_team run, member relativeMember]` | Use projection route key `<taskTeamRunId>/<relativeRouteKey>` as backend route | Scoped UI keys are for display/maps only. |
| Nested task-team path | `member TeamA -> task_team tt1 -> member TeamB -> task_team tt2 -> member api_engineer` | Add special fixed kind `task_team_member_task_team_member` | Recursive model naturally handles arbitrary depth. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep old flat structural selector as a separate backend routing path | Existing clients/tests send `target_member_route_key` / `target_member_path` | Rejected as internal architecture | Accept only at parser boundary and normalize to `ConversationTargetAddress`. |
| Encode runtime ids into `target_member_route_key` slash strings | Minimal payload change | Rejected | Use typed `task_team` / `task_agent` segments. |
| Implement fixed target kinds for common runtime cases | Earlier draft covered one-level examples | Rejected | Use recursive segment path. |
| Let malformed runtime target fall back to structural logical member | Might appear user-friendly when task run is gone | Rejected | Explicit invalid-target result/no fallback. |
| Preserve composer hidden behavior for runtime projections while backend supports addresses | Avoids UI changes | Rejected | Composer visibility is addressability-based. |
| Reuse tool approval selector payload for ordinary chat | Existing payload has task runtime fields | Rejected for this ticket | Ordinary chat gets `ConversationTargetAddress`; approval stays command-specific. |

## Derived Layering (If Useful)

- Frontend view/store layer: resolves focus and orchestrates send.
- Frontend transport layer: serializes `ConversationTargetAddress` into websocket payload.
- Backend transport layer: parses payload into normalized domain address.
- Team execution domain boundary: `TeamRun` accepts a conversation address.
- Concrete mixed backend control layer: `MixedConversationTargetRouter` traverses the path through existing registries and handles.
- Runtime/member layer: existing agent runs and child team runs receive the actual message.

Layering is explanatory only; the governing boundary is `TeamRun`, and the routing owner is the mixed backend router behind it.


## Design-Impact Amendment — Supported Live Task-Team Projection Creation

### Decision

Real UI task-team creation through a supported `delegate_task` runtime is in scope as a no-regression and validation precondition for conversation-target-addressing. It is **not** a redesign of task lifecycle semantics. The address model remains `ConversationTargetAddress`.

The approved live validation runtime expectation is:

- Codex app-server coordinators are not required by this ticket to expose `delegate_task`.
- AutoByteus native coordinators that do expose `delegate_task` and advertise visible team targets must carry enough team descriptor metadata into native tool execution for those advertised targets to resolve.

### Current Failure Shape

`buildAutoByteusManagedTeamContext(...)` serializes `members` as generic rows containing only `memberName`, `memberPath`, `memberRouteKey`, and `memberRunId`. `TaskDelegationInputResolver.resolveTeamTarget(...)` can only resolve team targets from context members whose `memberKind === 'agent_team'` and that have ingress identity. Therefore an AutoByteus prompt can advertise `BuildSquad` from rich `MemberTeamContext`, while the `delegate_task` tool execution sees no team rows and returns `TASK_TEAM_TARGET_NOT_FOUND`.

### Required Design Response

Add or complete a narrow task-delegation context-preservation slice:

| File / Boundary | Required Responsibility | Notes |
| --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-managed-team-context-builder.ts` | Serialize `MemberTeamContext.members` with typed member descriptors. Agent rows carry `memberKind: 'agent'`, route/path/run identity, `runtimeKind`, role, and description. Team rows carry `memberKind: 'agent_team'`, route/path/run identity, `teamDefinitionId`, optional `childTeamRunId`, optional `coordinatorMemberRouteKey`, role/description, and `representative`/`ingress` identity. | The builder is the source of native `customData.teamContext`; dropping fields here breaks all native task-delegation tools. |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-autobyteus-context.ts` | Normalize the typed native rows into `TaskDelegationContextMember` values without defaulting missing `memberKind` on visible team rows to agents. Validate malformed team descriptors with explicit task-delegation context errors. | Start from committed source and add the typed-row normalization intentionally; no diagnostic edit is approved implicitly. |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-service.ts` or a new focused mapper near task-delegation context code | Avoid duplicated member/team descriptor conversion policy by extracting a pure mapper if both direct `MemberTeamContext` tools and AutoByteus native customData need the same shape. | Do not create a generic helper detached from task-delegation ownership. |
| Tests under `autobyteus-server-ts/tests/unit/...` and/or existing task-delegation integration tests | Prove an AutoByteus native context containing `BuildSquad` as an `agent_team` lets `delegate_task` resolve the team target and create/start a task-team path; prove malformed/missing team metadata fails clearly. | API/E2E should rerun the real `open_tab` click-through after implementation/code review. |

### Boundary Rules

- Do not add routing logic to the conversation-address websocket handler to manufacture projections.
- Do not create fake frontend task-team projection state for API/E2E.
- Do not require Codex app-server task delegation exposure for this ticket.
- Do not broaden ordinary chat into task lifecycle operations. The fix preserves task-delegation context identity so an existing lifecycle path can create the real runtime projection used by the chat-addressing UI.
- Implementation should start from committed source; no production-source diagnostic diff is approved merely because it may have existed during API/E2E investigation.

## Migration / Refactor Sequence

1. Add backend domain address types in `conversation-target-address.ts` with normalization helpers for member segments and debug strings.
2. Add frontend address types and a target-key builder. Define canonical payload mapper to snake_case.
3. Build backend parser:
   - Reject scalar selector fields with existing `hasInvalidCommandSelectorFields`.
   - Reject payloads containing both nested `conversation_target_address`/`conversationTargetAddress` and flat structural selector fields.
   - Parse nested address segments and validate required ids/kinds.
   - Normalize flat structural selector fields to `{ segments: [{ kind: 'member', ... }] }`.
   - Validate optional parent team run id against websocket session; choose reject on mismatch for deterministic behavior.
4. Extend `TeamRun`, `TeamRunBackend`, `TeamManager`, and mixed backend adapter with `postMessageToConversationTarget`.
5. Implement `MixedConversationTargetRouter` behind `MixedTeamManager`:
   - Handle empty/default address only if preserving existing no-target `TeamRun` default behavior is needed; otherwise require at least one segment for websocket chat.
   - Resolve `member` segments exactly in current scope first.
   - If a member selector contains a nested path through a structural subteam, split/enter structural child via `MixedSubTeamMemberHandle` instead of dropping the remainder.
   - Enforce segment order: `task_agent` only after agent member and terminal; `task_team` only after team member; continued segments after task-team are relative to child scope.
   - Return deterministic `AgentOperationResult` failures with `INVALID_TARGET`-style codes/messages and no fallback.
6. Extend `MixedTaskTeamInstanceRegistry`, `MixedTaskTeamMemberHandle`, and `MixedSubTeamMemberHandle` with child-address entry methods that preserve readiness/event-binding ownership.
7. Modify `AgentTeamStreamHandler.handleSendMessage` to call parser and `teamRun.postMessageToConversationTarget`; remove structural-only handler path for `SEND_MESSAGE`.
8. Add frontend resolver `teamConversationTargetAddress.ts`:
   - Structural nodes -> one `member` segment.
   - Task-agent projection under structural member -> `member + task_agent`.
   - Task-team root -> `member + task_team`.
   - Task-team child -> `member logical team + task_team + member relative`.
   - Task-agent inside task-team child -> above + `task_agent`.
   - Prefer stored `conversationTargetSegments` on projection nodes; fallback reconstruction is allowed only for existing one-level metadata.
9. Update task projection builders to store inherited/full `conversationTargetSegments` on runtime projection nodes where available.
10. Update `TeamWorkspaceView` to show composer when resolver returns an addressable target and to label runtime targets clearly.
11. Update `agentTeamRunStore.sendMessageToFocusedMember`:
    - Consume resolver output.
    - Use `localTargetKey` for upload/dedupe/local placement.
    - Do optimistic insertion only when a concrete `AgentContext` exists; for team/task-team roots without leaf context, defer local insertion to stream events or keep existing subteam draft behavior.
    - Send `ConversationTargetAddress` to `TeamStreamingService`.
12. Update `TeamStreamingService.sendMessage` and protocol types to emit `conversation_target_address`.
13. Remove obsolete route-only assumptions/tests and add required unit/integration coverage.
14. Run targeted frontend/backend tests, then downstream API/E2E coverage investigation should decide broader executable coverage.
15. Rework after live `open_tab` blocker: preserve typed visible team descriptors in AutoByteus native task-delegation context, add focused unit/integration coverage for advertised team target resolution, then rerun code review and API/E2E real UI click-through.

## Key Tradeoffs

- Typed recursive segments are slightly more verbose than slash strings, but they reflect the real participant tree and keep runtime ids unambiguous.
- Parser-level normalization of flat structural selectors preserves existing structural chat without dual backend routing.
- Storing full segments on projection nodes adds metadata, but it is safer for nested-nested task-team cases than trying to reconstruct arbitrary ancestry from scoped route keys.
- The backend router adds a new file/folder, but it prevents `mixed-team-manager.ts` and the websocket handler from becoming routing blobs.
- Task lifecycle commands remain separate to avoid accidentally making ordinary chat change lifecycle state.

## Risks

- Projection metadata for deeply nested task-team-in-task-team cases may currently be incomplete. Mitigation: store full inherited `conversationTargetSegments` as projections are created and extend event projection tests.
- Existing optimistic insertion assumes a leaf `AgentContext`. Mitigation: make local placement explicit and defer optimistic insertion for team/default targets without a concrete context.
- Structural nested member routing through subteams may require tightening existing mixed backend traversal so path remainders are not lost. Mitigation: add child-address methods on `MixedSubTeamMemberHandle` and tests for deep structural and structural+runtime paths.
- Ambiguous payload aliases could accidentally create two authorities. Mitigation: reject nested+flat mixed payloads and document canonical snake_case emission.
- Context-file owner naming may remain route-key-oriented. Mitigation: use `conversationTargetKey` / `targetUploadKey` at the store layer and avoid treating that key as a backend route.
- AutoByteus native task-delegation context may advertise visible team targets from rich prompt context but execute tools with narrowed generic member rows. Mitigation: preserve typed `agent_team` descriptors and ingress metadata through `buildAutoByteusManagedTeamContext` and native context normalization.

## Guidance For Implementation

- Do not implement the old fixed-kind union.
- Do not overload `target_member_route_key` with runtime run ids.
- Keep `SEND_MESSAGE` chat routing behind `TeamRun.postMessageToConversationTarget`.
- Keep parser normalization and mixed backend traversal in separate files.
- Prefer canonical snake_case payload emission from frontend. Accept camelCase nested address aliases only if tests show this is consistent with current protocol expectations.
- Use explicit invalid-target results for stale/malformed runtime segments and send websocket invalid-target errors where the existing command pattern does so.
- Preserve existing tool approval and interrupt command paths unless they are directly broken by shared type changes.
- Required coverage to add/update:
  - Frontend resolver tests for structural node, deep structural node, task-agent projection, task-team root, task-team child, task-agent under task-team child, nested inherited segments, missing identity rejection, and composer visibility.
  - Frontend serialization/store tests verifying `conversation_target_address` and `conversationTargetKey`/dedupe behavior.
  - Backend parser tests for nested address, flat structural normalization, scalar rejection, nested+flat ambiguity rejection, parent-team mismatch, malformed segments, and invalid order.
  - Mixed backend runtime tests for exact delivery to structural leaf, structural subteam default, task-agent run, task-team root default, task-team child member, task-agent under task-team child, nested task-team paths, concurrent task runs, and no fallback on invalid/stale run ids.
