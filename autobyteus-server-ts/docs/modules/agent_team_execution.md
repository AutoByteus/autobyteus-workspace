# Agent Team Execution

## Scope

Manages running team runs, selecting the authoritative team backend, restoring persisted team activity, and streaming member/team events through one server-owned boundary.

## Backend Selection Model

- `RuntimeKind` is the **member execution runtime** subject.
- `TeamBackendKind` is the **team orchestration** subject. Active server team execution uses `TeamBackendKind.MIXED` for every team composition.
- `TeamRunService` builds a recursive topology plan before launch:
  - every member receives a stable `memberPath` array and slash-delimited `memberRouteKey`
  - launch configs for nested leaf agents are matched by `memberRouteKey` or `memberPath`; no bare member-name fallback is defined for nested launch config matching
  - homogeneous AutoByteus, Codex, Claude, heterogeneous, and nested team definitions all produce `TeamBackendKind.MIXED`
- `AgentTeamRunManager` delegates create/restore work only to `MixedTeamRunBackendFactory`.
- Per-member runtime selection remains below the team boundary: `MixedTeamManager` builds member `AgentRunConfig`s, and `AgentRunManager` selects the AutoByteus, Codex, or Claude AgentRun backend from each member's `runtimeKind`.


## Launch-Time Identity Assignment

`TeamRunService` owns new team-run identity assignment before runtime creation.
New public launches allocate a `<team_definition_name_slug>_<uuid-without-dashes>`
`teamRunId`, then assign identities through `TeamRunLaunchIdentityAssignment`
before calling `AgentTeamRunManager.createTeamRun(config, teamRunId)`. Public
launch input must not provide `memberRunId` or `childTeamRunId`; explicit ids are
stored data only on restore/historical paths.

Concrete agent members receive allocator-backed opaque `memberRunId` values with
the same `<agent_definition_name_slug>_<uuid-without-dashes>` shape as
standalone runs. `agent_team` wrapper members receive their generated child
`teamRunId` as both the wrapper `memberRunId` and `childTeamRunId`. Member route
keys and member paths remain the command/routing identity; `memberRunId` is a
runtime/storage id and must not encode or replace route semantics.

Member memory ownership is root-hierarchical. Direct members write under
`memory/agent_teams/<rootTeamRunId>/<memberRunId>/...`; nested subteam leaf
members append their child team run id path before the leaf run id, for example
`memory/agent_teams/<rootTeamRunId>/<childTeamRunId>/<memberRunId>/...`; deeper
subteams append each nested child team run id. Task-agent runs write under the
logical member's same team memory scope, for example
`memory/agent_teams/<rootTeamRunId>/<...teamRunPath>/<taskAgentRunId>/...`.
`AgentMemoryLocationService` is the shared read/write/projection owner for this
shape, carrying `rootTeamRunId`, `teamRunPath`, member/task run identity,
route/path metadata, and the resolved `memoryDir`.

Route-key suffix selection is intentionally unambiguous. Exact route-key matches
win; otherwise a suffix such as `worker` resolves only when exactly one candidate
exists in the requested team scope. Ambiguous suffixes fail instead of choosing a
first match. Fully-qualified route keys such as `ReviewSquad/worker`, or a child
team run scoped request for `worker`, must be used when duplicate nested leaf
names exist.

## Current Execution Paths

| Path | Authoritative owner | Member execution primitive | Notes |
| --- | --- | --- | --- |
| Any server team run (all-AutoByteus, all-Codex, all-Claude, heterogeneous, or nested) | `MixedTeamManager` | Agent members own one runtime-specific `AgentRun`; subteam members own child `TeamRun`s | `MixedTeamManager` is retained by name and is the single active server team manager. Runtime-specific team managers/backends are not instantiated by server team create/restore. |
| AutoByteus member in a server team | `MixedAgentMemberHandle -> AgentRunManager -> AutoByteusAgentRunBackendFactory` | Standalone AutoByteus `AgentRun` | Server-composed `MemberTeamContext`/`MemberRunInstructionComposer` prompt path provides team instructions, roster, send-message guidance, and task-delegation guidance; native manifest injection is not used for server team members. |
| Codex or Claude member in a server team | `MixedAgentMemberHandle -> AgentRunManager` | Standalone Codex or Claude `AgentRun` | Uses runtime-neutral member bootstrap for teammate instructions, `send_message_to`, and configured task-delegation tools. |
## Nested Member Identity And Commands

- `TeamMemberSelector` is the domain/backend structural member identity for
  launch config matching and route-key/path-scoped control commands:
  - `{ kind: "path", memberPath: [...] }`
  - `{ kind: "route_key", memberRouteKey: "subteam/leaf" }`
- `memberPath` / `memberRouteKey` are canonical for nested members.
  Transport/GraphQL command inputs that use `TeamMemberSelector` must provide
  explicit path or route-key selector fields. Scalar target aliases such as
  `target_member_name`, `target_agent_name`, command-side `agent_name`,
  command-side `agent_id`, and camelCase equivalents are rejected at the edge
  instead of normalized.
- `ConversationTargetAddress` is the canonical user-chat target for team
  WebSocket `SEND_MESSAGE`. It is a typed segment path rooted at the
  WebSocket-bound parent team run:
  - `member` selects a structural member by `memberRouteKey` or `memberPath`
  - `task_team` selects one concrete delegated task-team execution by
    `taskTeamRunId`
  - `task_agent` selects one concrete delegated task-agent execution by
    `taskAgentRunId`
  Existing flat `target_member_path` / `target_member_route_key` send payloads
  are parser-bound compatibility input only and normalize to a one-segment
  `member` address. Runtime run ids must not be encoded into structural route
  keys.
- Top-level executable handles may be derived only from an already accepted
  `memberPath[0]` or first route-key segment. Bare names are never an
  authoritative public command selector.
- A terminal chat `member` segment that names a subteam creates/restores the
  child `TeamRun` and posts to that child team's default/coordinator target.
  `task_team` and `task_agent` segments route only to the exact runtime run id
  supplied in the address. The parent runtime does not choose an arbitrary
  flattened child leaf or fall back from a stale runtime id to a structural
  template.
- `TeamRun.postMessage(...)` defaults an omitted target to the configured
  coordinator route key or sole member route key when one exists. A remaining
  `null` target means a true team-level/no-target command and must not be
  converted into a guessed member identity.
- Tool approval targets must resolve to an agent member. A request aimed only
  at a subteam member is rejected; approval clients must use the
  `source_path` / `source_route_key` or member path/route emitted with the
  approval request event. For delegated task-agent tool calls, approval
  clients must preserve the emitted concrete `task_agent_run_id` so the
  approval/denial command routes to the active task-agent runtime rather than
  the logical member template. For task-team scoped child tool calls, approval
  clients must also round-trip `task_team_run_id` plus the emitted relative
  child selector (`task_team_relative_member_path` or
  `task_team_relative_member_route_key`) so the parent team routes the decision
  into the active task-scoped child team run before resolving the child member.
- Team events carry canonical `sourcePath`. Any display aliases are derived
  transport metadata only and are not accepted as command target inputs.

## Root Team Lifecycle Authority

`AgentTeamRunManager` is the only public owner of root team liveness. Its active
run registry projects `TeamRunLifecycleSnapshot { teamRunId, isActive }` and
notifies listeners only when the boolean state changes. Active-to-active
replacement does not publish false/true flicker, stale-backend cleanup cannot
deactivate a replacement, rejected termination leaves the run active, and
accepted termination publishes inactive after unregistering the exact run.

The team WebSocket publishes this fact as
`TEAM_RUN_LIFECYCLE { team_run_id, is_active }`. Connection subscription state,
leaf-agent lifecycle, task execution state, failure observation, and open-work
settlement are separate facts and must not be used to synthesize root liveness.
The stream handler binds event and lifecycle listeners before taking a fresh
snapshot, then sends leaf `AGENT_STATUS` snapshots and the root lifecycle
snapshot so reconnect cannot miss a transition.

## Command-Start Status

Team message commands publish backend-owned `initializing` as soon as a concrete target is resolved and before slow member startup, child-team restore, provider session/thread startup, or first-turn send work is awaited.

- Mixed leaf-agent handles publish member-scoped `AGENT_STATUS` before creating or restoring their child `AgentRun`.
- Subteam and task-team containers do not publish a represented-team or root
  five-state status. Commands routed through a subteam obtain visible lifecycle
  from the exact leaf agent that accepts the command; root activity remains the
  manager-owned binary lifecycle described above.

`MemberCommandStatusOverlayStore` is the shared owner for pending command-start
overlays. Each executable-member handle owns its own store instance; it is not a
root or aggregate status authority. The store gates `initializing` publication
to current effective `offline`/`idle`, keys pending state by logical member or
concrete task-agent execution, applies it only to leaf snapshots, replaces
pending startup with member-scoped `error` on command failure, and clears it
when a matching runtime `AGENT_STATUS` arrives or the handle is disposed.
Command owners still own target resolution, lazy runtime creation/restoration,
child-team creation, provider send sequencing, and failure handling.

Pending command-start overlays are reflected only in the affected leaf-agent
snapshot while startup is in flight. Runtime status events, command rejection,
thrown failures, termination, or disposal must replace or clear those overlays
so clients cannot remain indefinitely in `initializing`.

## Server-Owned Task Delegation Lifecycle

Team task delegation is owned by `TaskDelegationService`, not by runtime-specific
handlers, legacy model-facing task-plan tools, or future MCP transport code. The
model-facing task-delegation protocol is:

- `delegate_task`: a coordinator/delegator submits one bounded ready-to-run task
  with `target: { kind: "member" | "team", name }`, rich `description`, and
  optional `reference_files` containing absolute local filesystem paths only.
  Member targets are physical current-team agent members. Team targets are
  visible current-team `agent_team` / subteam members that become the
  accountable task owner. The old direct `member_name` selector is not part of
  the current model-facing surface.
- `submit_task_result`: the bound task-agent or task-team ingress context
  submits one reviewable result for its current task. The tool is selector-free;
  task identity comes from the caller's bound execution context, and optional
  `reference_files` follow the same absolute-local rule as delegated work
  packets.
- `review_task_result`: the task review owner reviews the latest pending
  submission by `task_id` using `decision="accept"` or
  `decision="request_revision"`. Revision decisions require a non-empty
  task-result `comment` and are delivered by the system to the same task-agent
  or task-team execution instance. Optional review `reference_files` must also
  be absolute local filesystem paths.

`send_message_to` remains ordinary teammate communication only. It is not the
task result, revision, acceptance, or finalization protocol. Communication
recipients and delegation targets are separate prompt rosters: a subteam
representative/coordinator can be a communication recipient while the visible
subteam itself is the team delegation target and accountable owner.

Legacy task-plan tool names (`create_task`, `create_tasks`, `assign_task_to`,
`get_my_tasks`, `get_task_plan_status`, and the old local task-plan
`update_task_status`) must not be exposed as a parallel model workflow. Task
state is split between active-only delegation ledger entries for runtime
correlation/settlement safety and root-team-run durable `TaskDelegationRecord`
rows for user-visible task history.

The happy path is push-based:

1. The runtime projection builds a `TaskDelegationToolContext` from the current
   server-owned `MemberTeamContext`; AutoByteus native tool execution receives
   the same context serialized through `initialCustomData.teamContext` with
   typed member rows (`memberKind: "agent"` or `"agent_team"`), team definition
   ids, coordinator/ingress identity, and runtime run ids preserved. That
   serialized shape is normalized back into the task-delegation context before
   tool execution, so model-visible team targets such as `BuildSquad` remain
   resolvable when an AutoByteus coordinator calls `delegate_task`.
   `TaskDelegationToolRunRouter` binds the tool call either to the active parent
   `TeamRun` or, for task-team ingress result submission, to the active
   task-team child run registered for that parent.
2. `TaskDelegationService` reserves the next task id through
   `TaskDelegationRecordsService` using the root-team-run persistence scope,
   creates an active-only `starting` ledger entry, validates the explicit target
   object against the delegation target roster, and treats the submitted task as
   independent ready-to-run work. Delegation targets are topology-derived and are
   not inferred from communication recipients.
3. For a member target, activation binds a concrete task-agent execution in the
   `TaskAgentDirectory`, starts one task-agent instance through
   `TeamRun.startTaskAgentInstance(...)`, and sends a task-centered work packet
   that includes the task id, `description`, optional reference files, and
   instructions to use `submit_task_result` for reviewable output. Runtime
   identifiers and target labels remain in backend metadata/events for routing
   and diagnostics, not in the task packet body by default.
4. For a team target, activation materializes a `TaskTeamInstanceIdentity` and
   child team-run config, starts one task-scoped child team run through
   `TeamRun.startTaskTeamInstance(...)`, binds the active child run in
   `TaskTeamActiveRunDirectory`, and sends the same task-centered work-packet
   shape to the child team's ingress coordinator/representative. The packet
   metadata includes `execution_kind: "task_team"`, `task_team_run_id`, and
   `task_team_instance_id`; the accountable owner remains the logical team
   target, but team/accountable labels stay in metadata/events rather than the
   runtime packet body or visible activation copy.
5. Successful activations replace the `starting` entry with an active
   `record` entry, construct a normalized durable `TaskDelegationRecord` with
   `status: "active"`, sender/receiver `ConversationTargetAddress` values,
   `receiverTargetKind`, task content/reference files, compact `taskRun`
   identity, and `createdAt`, then persist that record before emitting
   `TASK_DELEGATION_ACTIVATED`. Failed activations delete the active-only
   starting entry, unregister the starting execution, and return the
   activation-failure reason to the tool caller. `not_started` is a public tool
   result status only; it is never a durable task-record status.
6. The bound task-agent or task-team ingress context calls `submit_task_result`.
   The ledger records a distinct submission update, moves the task to
   `awaiting_review`, persists the updated durable record, emits
   `TASK_DELEGATION_RESULT_SUBMITTED` and status projection, and the notification
   dispatcher attempts a system notification to the task review owner.
7. The task review owner calls `review_task_result`. `request_revision` records
   a review update linked to the pending submission id, returns the task to
   `active`, persists the updated durable record, emits review/status events,
   and attempts a system revision notification to the same task execution
   instance. `accept` records the review update, marks the task `accepted`,
   persists the terminal durable record, emits review/status events, and
   requests safe settlement.
8. Notification delivery is non-transactional after valid lifecycle mutation:
   committed state and events remain authoritative even if the system input is
   rejected. Public `submit_task_result` and revision-request
   `review_task_result` calls still succeed for the recorded lifecycle change,
   but return only a concise public `message` when notification delivery fails;
   raw notification warning objects and route/run ids remain internal.
9. Task-agent settlement waits for an idle/offline event from the bound
   task-agent run, verifies there is no non-terminal assigned work or child
   delegation owned by that run, protects the coordinator by default, and calls
   `TeamRun.settleTaskAgentInstance(routeKey, taskAgentRunId, reason)` with a
   stale-route guard.
10. Task-team settlement watches the known child team run until the child has no
    open task-delegation ledger work, no active task-agent instances, and no
    private execution work reported by `TeamRun.hasOpenExecutionWork()`. Review
    acceptance and child events are only settlement wakeups: one coordinator-owned lifecycle transition may be
    `settling` for a given `taskTeamRunId` at a time, so duplicate wakeups must
    not start duplicate destructive close sequences. Settlement then calls
    `TeamRun.settleTaskTeamInstance(logicalTeamRouteKey, taskTeamRunId,
    reason)`. Accepted settlement terminates the child run through the child
    team's lifecycle owner; already-stopping/offline child state converges as the
    desired inactive outcome, while real active termination failures remain
    rejected and keep the active binding visible for retry/diagnostics. After
    accepted termination, the coordinator detaches the task-team run from the
    delegation run registry and
    `TaskTeamActiveRunDirectory` is unbound so future status snapshots and
    reconnect/reload paths do not rehydrate the completed transient row. Future
    delegations to the same logical team remain topology-based and allocate fresh
    task-team run identity.

Task-delegation work packets and lifecycle follow-up notifications are still
delivered as runtime/model input, but their visible live transcript projection is
server-owned. Constructors stamp those `SenderType.SYSTEM` messages as
task-delegation system task notifications and request generic AutoByteus system
task-notification suppression. Each in-scope constructor also stamps
task-centered display content so the transcript notification can omit internal
runtime ids, tool protocol text, sender/delegator/reviewer framing, target kind,
and target/accountable-team labels while the runtime input remains actionable.
Activation display content uses one uniform template for member and team targets
(`You have a new task.` plus task id, task description, and reference files), so
team-target activation must not expose `New delegated team task`, `Accountable
team`, logical member labels, or ingress/child-run details. After an accepted
mixed leaf delivery, the member boundary forwards the input to the runtime and
emits one local `SYSTEM_TASK_NOTIFICATION` event for the target conversation
instead of also publishing a `MEMBER_INPUT` echo. Ordinary user messages and inter-agent deliveries continue to use `MEMBER_INPUT`; task-delegation notification
messages must not use both live surfaces for the same payload.

Agent-facing task-delegation tool results are intentionally smaller than the
internal lifecycle events:

- Successful `delegate_task` returns only `task_id` and `status: "active"`;
  activation failure returns `task_id`, `status: "not_started"`, and a concise
  `message`.
- Successful `submit_task_result` returns only `task_id` and
  `status: "awaiting_review"`; if reviewer/delegator notification delivery
  fails after the submission is recorded, the result adds only a concise
  `message`.
- Successful `review_task_result` returns only `task_id` and the resulting
  `status` (`"accepted"` for accept, `"active"` for revision). A non-fatal
  revision-notification delivery failure adds a concise `message`.

Internal execution identities, submission/review ids, review decisions,
settlement state, and notification warning objects remain available through
ledger, event, notification, and websocket payloads rather than through public
tool results.

`TASK_DELEGATION_*` events use `TeamRunEventSourceType.TASK_DELEGATION` in the
domain stream and are flattened to WebSocket `TASK_DELEGATION_EVENT` messages.
Current event types include `TASK_DELEGATION_ACTIVATED`,
`TASK_DELEGATION_RESULT_SUBMITTED`, `TASK_DELEGATION_RESULT_REVIEWED`, and
`TASK_DELEGATION_STATUS_UPDATED`. Result/review payloads include `submissionId`,
`reviewId`, `reviewedSubmissionId`, review `comment`, and status
`acceptanceComment` where applicable so consumers do not infer relationships or
review text from history array order. Flattened payloads include
`execution_kind` plus the concrete task-agent or task-team execution identity;
task-team payloads carry
`task_team_run_id`, `task_team_instance_id`, `team_route_key`, and `team_path`.
Events emitted by members inside a task-team child run also carry
`task_team_relative_member_path` and, when resolvable,
`task_team_relative_member_route_key` so clients route scoped child events by
`task_team_run_id` instead of guessing from the structural team route.

Task-delegation events also carry UI-facing task metadata for live projection,
including normalized `taskId`/label/description, target identity, status,
execution kind/run id, `referenceFiles`, and original normalized
`taskArguments`. The Team tab `Tasks` section uses those live events only as
runtime enrichment and refresh triggers; its durable display source is
`getTaskDelegationRecords(teamRunId)`. `referenceFiles` are task-owned rows from
normalized task records, not Team Communication message references, and must not
use message ids or message reference routes. For new records, `referenceId` is a
route-safe opaque identity and `path` is the stored normalized absolute local
path. `TaskDelegationService` remains the active-runtime reference authority
while a service is registered; when the active service is gone,
`TaskDelegationReferenceContentService` falls back to the persisted
root-team-run records file.

Durable task records are stored once per root team run at:

```text
<memoryDir>/agent_teams/<rootTeamRunId>/task_delegation_records.json
```

The file envelope is `{ teamRunId, records }`, where `teamRunId` is the root
storage team run id. Each `TaskDelegationRecord` stores address-first
sender/receiver identity, `receiverTargetKind`, content, normalized task-owned
reference files, compact task-run address, submission/review updates, and
`createdAt`. Task-team child-run delegations reserve ids from and write to this
root file while preserving root-visible child address segments; no child-local
`task_delegation_records.json` is written. Missing or corrupt records files
degrade to an empty records list with a backend warning. The GraphQL read API is
`getTaskDelegationRecords(teamRunId)`, and persisted `active` or
`awaiting_review` rows are visible history only after restart; they do not
restore active task-agent/task-team tool authority.

The REST content route for a selected task reference is:

```text
GET /team-runs/:teamRunId/task-delegations/:taskId/references/:referenceId/content
```

The route serves content through `TaskDelegationReferenceContentService` with
`cache-control: no-store`. Missing/unavailable references map to `404`, invalid
stored reference paths map to `400`, unreadable paths map to `403`, and callers
must continue to treat `teamRunId + taskId + referenceId` as the explicit task
subject identity. The route resolves the stored task reference by identity and
then streams the stored absolute `path`; clients and servers must not derive a
filesystem path from `referenceId`. Historical relative references and pre-fix
path-derived ids are intentionally not migrated or served through
workspace-relative, wildcard-route, or frontend fallback compatibility paths.

### Task Delegation Validation Notes

Durable deterministic coverage lives in the task-delegation integration/unit
suites under `tests/integration/agent-team-execution/` and
`tests/unit/agent-team-execution/`. The integration suite covers member-target
and team-target delegation, task-team ingress, child tool routing, revision,
settlement gates, cleanup, sequential same-logical-team delegation,
absolute-only task `reference_files`, route-safe task `referenceId` generation,
successful readable content fetches for stored absolute paths, and invalid
stored relative-path readback. A gated live mixed-runtime E2E lives at
`tests/e2e/runtime/mixed-task-delegation.e2e.test.ts`; it creates a real
GraphQL/websocket team with an AutoByteus/LMStudio Qwen coordinator and a Codex
`gpt-5.5` worker for the concrete task-agent result/revision path. The live path
is intentionally skipped unless explicit live flags are set, so local/default
validation can run the file and expect a skipped test while live validation can
opt in with an exact `LMSTUDIO_MODEL_ID` for a loaded provider-native
tool-call-capable model. If `LMSTUDIO_MODEL_ID` is not set, the suite falls back
to `LMSTUDIO_TARGET_TEXT_MODEL`/default Qwen fragment discovery.

```bash
RUN_MIXED_TASK_DELEGATION_E2E=1 RUN_LMSTUDIO_E2E=1 RUN_CODEX_E2E=1 \
  AUTOBYTEUS_STREAM_PARSER=api_tool_call \
  LMSTUDIO_MODEL_ID='<loaded-lmstudio-model-id>' \
  CODEX_E2E_TASK_DELEGATION_MODEL=gpt-5.5 \
  pnpm -C autobyteus-server-ts exec vitest run \
    tests/e2e/runtime/mixed-task-delegation.e2e.test.ts \
    -t "AutoByteus coordinator delegates work and reviews a concrete Codex task-agent result/revision cycle" \
    --no-file-parallelism
```

## Mixed-Team Communication Contract

- `MemberTeamContextBuilder` creates the runtime-neutral per-member communication/bootstrap and task-delegation contract:
  - current member identity
  - current member path/route identity
  - teammate list and allowed recipients, including subteam members when they
    are addressable at the current team boundary
  - optional team instruction
  - `send_message_to` team-route delivery handler with optional explicit `reference_files` path references
  - task-delegation identity inputs used by task-delegation tool projections
- `InterAgentMessageRouter` / mixed delivery normalize sender and recipient
  selectors, then deliver through the receiving member handle. Agent recipients
  use the shared `AgentRun.postUserMessage(...)` boundary; subteam recipients
  post into the child `TeamRun` default/coordinator target.
- Communication rosters are scoped to the member boundary. Parent members can
  see a subteam coordinator/representative as an addressable recipient, while a
  represented child coordinator can see local child teammates plus exposed
  immediate parent-boundary members. This is descriptor-owned visibility, not a
  hidden `reply_to_sender` alias or arbitrary cross-level access.
- Representative delivery preserves the actual leaf participant identity. For
  example `program_manager -> review_lead` resolves to parent-root route
  `BuildSquad/review_lead`, enters the top-level `BuildSquad` subteam handle for
  execution, and strips to the child-local selector `review_lead` only after the
  child boundary is reached.
- Upward reporting uses the same parent-root descriptor model in reverse:
  `BuildSquad/review_lead -> program_manager` records the sender as the leaf
  representative and delivers recipient input to the parent member without
  exposing unrelated ancestors or sibling internals.
- Communication projections preserve sender/receiver `ConversationTargetAddress`
  values so representative, task-team, task-agent, and static nested-member
  messages retain their concrete participant identity through `member`,
  `task_team`, and `task_agent` segments instead of a parallel flat
  sender/receiver model.
- Leaf member input is emitted as a separate member-input event with stable
  message/dedupe identity. For inter-agent delivery into a child team, this
  event is what lets the child coordinator transcript show the inbound
  "received a message from ..." prompt before the child reply.
- Recipient-visible content still includes generated **Reference files:**
  blocks only from explicit structured `reference_files`.
- Runtime adapters expose `send_message_to` as one logical tool invocation with
  selector-based dispatch. `recipient_name` stays inside this team communication
  contract and creates Team Communication projection after accepted recipient
  input. `target_agent_run_id` is not a team roster selector; it is the global
  live-only exact `AgentRun.runId` route owned by `src/agent-communication`,
  resolves only through `AgentRunManager.getActiveRun(...)`, rejects inactive or
  non-live ids, and emits direct target-run events without `team_run_id` or Team
  Communication projection. Codex App Server and Claude Agent SDK members route
  first-party MCP `send_message_to` through the server-hosted
  `autobyteus_agent_tools` descriptor alongside other migrated server-owned
  backend tools. Codex receives this as thread-scoped
  `config.mcp_servers.autobyteus_agent_tools`; Claude receives it through SDK
  `mcpServers` and provider wire names such as
  `mcp__autobyteus_agent_tools__send_message_to`. Runtime converters normalize
  the route-backed lifecycle to canonical `send_message_to` before Activity,
  run-history, team stream, or memory consumers see it; raw MCP provider/server
  names and bearer/header config details must not leak into application-facing
  events or create extra Activity rows.
- AutoByteus members participating in mixed teams receive server-managed
  `teamContext` through `initialCustomData`. This context preserves the current
  member identity plus typed member/team delegation roster entries so local
  AutoByteus task-delegation wrappers can resolve the same visible team targets
  advertised in the prompt. The bound server-owned `send_message_to` tool still
  carries delivery through `MemberTeamContext` and `TeamRun` /
  `MixedTeamManager`.
- Mixed AutoByteus standalone members explicitly strip legacy `ToolCategory.TASK_MANAGEMENT` names before exposure, while preserving configured server-owned task-delegation tools (`delegate_task`, `submit_task_result`, and `review_task_result`).
- Task-delegation and communication tools are configured agent capabilities, not
  runtime-level provider policy. Codex App Server and Claude Agent SDK receive
  them through Agent Tools MCP only when the current member/tool configuration
  and member-team context make them available; AutoByteus uses its local
  wrappers. Runtime adapters must not add provider `tool_choice` special cases,
  forced-tool dampening, or framework auto-review behavior for task results. If
  a model does not call an available tool despite clear instructions, treat that
  as prompt/model/test configuration until a framework invariant above is
  violated.

## Mixed Member Event Bridge

- `MixedTeamManager` is the only active server team manager; it subscribes to
  child `AgentRun` and child `TeamRun` streams through mixed member handles.
- Runtime AgentRun backends convert provider-native events below the agent-run
  boundary. Mixed member handles then enrich emitted events with
  team/member/task-agent provenance and forward them through the team stream.
- Task-team execution identity is carried outward as a tight
  `TaskTeamStreamScope`, not by reusing operational `TaskTeamInstanceIdentity`.
  Each ordinary nesting boundary prefixes source, member, and logical-team paths
  in the same parent frame and rebuilds their route keys. The transport mapper
  only validates and flattens that coordinate-consistent scope; it does not add
  prefixes, fall back to the root, or guess a leaf identity.
- This keeps provider conversion runtime-local while letting the mixed team
  boundary supply the context required by `FILE_CHANGE` derivation and
  `TEAM_COMMUNICATION_MESSAGE` projection.
- Produced `FILE_CHANGE` events remain scoped to the producing member run id and
  persist through the existing run-file-change service/content route. Explicit
  `reference_files` remain child metadata on team-level Team Communication messages.
- Multiple websocket/API subscribers must not create duplicate member runtime
  listeners or duplicate team projection passes for the same child runtime event.

## Restore / Persistence Notes

- Restore uses canonical recursive `TeamRunMetadata.memberTree` plus
  `TeamBackendKind`; it does not collapse mixed or nested teams back to one
  runtime owner.
- `TeamRunConfig.memberTree` is the authoritative topology. The flat
  `memberConfigs` projection is derived leaf-agent data for existing consumers
  and must not be used to infer nested ownership.
- Subteam metadata records the child `teamRunId`, child team definition id,
  coordinator route key, and child member tree. Restore recreates the parent
  mixed runtime with subteam handles that can restore their child `TeamRun`s on
  demand.
- Internal child team runs are implementation detail for the parent nested run.
  They can be restored through their parent subteam handle, but workspace
  history should not list them as independent top-level team rows.
- Historical flat team metadata is not compatibility-read for nested topology;
  unsupported legacy metadata fails instead of guessing a lost tree.
- Every executable member `AgentRun` receives a resolved `memoryDir` on create
  and restore through the mixed member-run path before the run reaches
  `AgentRunManager`. Direct members use
  `memory/agent_teams/<rootTeamRunId>/<memberRunId>/...`; nested members use the
  root-hierarchical
  `memory/agent_teams/<rootTeamRunId>/<...teamRunPath>/<memberRunId>/...` shape.
  Task-agent activation/recovery uses the same team memory scope plus the
  generated task-agent run id. `MixedAgentMemberHandle` only consumes this value
  and fails fast for recordable non-AutoByteus member configs that omit it; it
  must not derive a hidden fallback memory path.
- Member memory recording is attached at the `AgentRunManager` layer for mixed team members; runtime-specific AgentRun backends keep their own provider-local runtime details below that boundary.
- `TeamRunService.resolveTeamRun(teamRunId)` is the canonical restore-aware lookup boundary for callers that are allowed to resume a stopped persisted team run. It returns the active team runtime when present and otherwise attempts persisted restore before returning `null`.
- Team WebSocket connection and `SEND_MESSAGE` dispatch use `resolveTeamRun(...)`, so a follow-up message to a stopped-but-persisted team can restore the team runtime, rebind stream subscription to the restored `TeamRun`, and post to the requested `ConversationTargetAddress`.
- Active-only team controls still use the active lookup path. `INTERRUPT_GENERATION` and tool approval/denial commands must not restore a stopped team run as a side effect.
- Team generation interrupt is intentionally member-scoped. `TeamRun.interruptMember(targetMemberRouteKey, targetMemberRunId?)` is the domain boundary; backend managers resolve the route key as the authoritative target and use the optional run id only as a stale-target guard. A missing target or route-key/run-id mismatch rejects without retargeting or falling back to a team-wide interrupt.
- Persisted member metadata still carries the member runtime kind and platform-native run/thread/session id needed for restore.
- `applicationExecutionContext` stays member-local and flows through create/restore for mixed team members.
- Accepted restored follow-up messages call
  `TeamRunService.recordRunActivity(...)`, refreshing team metadata/history
  activity state while preserving the stable opening/coordinator title for the
  workspace history row.

## TS Source

- `src/agent-team-execution/domain/team-backend-kind.ts`
- `src/agent-team-execution/services/team-run-service.ts`
- `src/agent-team-execution/services/agent-team-run-manager.ts` (`AgentTeamRunManager`)
- `src/agent-team-execution/services/team-definition-topology-planner.ts`
- `src/agent-team-execution/services/member-team-context-builder.ts`
- `src/agent-team-execution/services/member-run-instruction-composer.ts`
- `src/agent-team-execution/services/inter-agent-message-router.ts`
- `src/agent-team-execution/services/team-command-status-overlay-store.ts`
- `src/agent-team-execution/task-delegation/*`
- `src/agent-tools/task-delegation/*`
- `src/agent-execution/backends/codex/task-delegation/*`
- `src/agent-execution/backends/claude/task-delegation/*`
- `src/agent-team-execution/services/team-member-command-start-status-events.ts`
- `src/agent-team-execution/domain/team-run-member-identity.ts`
- `src/agent-team-execution/backends/mixed/mixed-team-manager.ts`
- `src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.ts`
- `src/agent-team-execution/backends/mixed/members/*`
- `src/agent-team-execution/backends/mixed/events/mixed-team-event-bridge.ts`
- `src/agent-team-execution/backends/mixed/mixed-sub-team-run-factory.ts`
- `src/services/agent-streaming/agent-team-stream-handler.ts`
- `src/api/graphql/types/agent-team-run.ts`
