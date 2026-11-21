# Agent Team Execution

## Scope

Manages standalone flat Team runs, their direct-Agent membership (which follows
the Team definition while the run exists), runtime-specific Agent members, exact execution addressing, task delegation,
restore, and Team event projection through one server-owned boundary. Persistent
multi-Team composition belongs to [Agent Organization](./agent_orgs.md), not to
the Team runtime.

## Backend And Topology Model

- `TeamBackendKind.MIXED` remains the persisted backend-kind value, but current
  execution is constructed by `FlatTeamExecutionFactory`,
  `FlatTeamRunBackend`, and `FlatTeamExecutionManager`.
- `TeamRunService` and `FlatTeamTopologyPlanner` resolve one AgentTeam Definition
  V2 before launch. The root Team is `/`; all configured children are direct
  Agents, and exactly one is the configured coordinator.
- `TeamRunConfig.rootTeam` and its derived execution index are runtime
  authority. Logical names, flat roster projections, provider IDs, and browser
  state are not alternative topology authorities.
- Configured Team-in-Team composition is rejected. A Team delegated for a task
  is a team run of its own (autobyteus-461); it never becomes a member or a
  configured child of the run that delegated to it.
- Per-Agent runtime selection stays below the Team boundary. `AgentRunManager`
  selects the AutoByteus, Codex, Claude, AGY, Grok Build, or DeepSeek Harness backend from each launch setting.
  Each execution family injects its own provider factories, definition
  services, session authority, memory/context environment, and task-execution
  identity capabilities; Team execution never reaches across to another
  family's manager or identity allocator.

`antigravity_cli` is also a selectable external member runtime. It retains
the same exact Team member execution address and root-owned provider binding;
its capsule, permissions, and trace behavior are documented in
[Antigravity CLI Runtime](./antigravity_cli_runtime.md).

`grok_build` is likewise a selectable external member runtime with the same
exact member address and root-owned provider binding (the Grok `sessionId`);
see [Grok Build Runtime](./grok_build_runtime.md).

`deepseek_harness` members work the same way, bound to the dsh `sessionId`
and restored with `session/resume`; see
[DeepSeek Harness Runtime](./deepseek_harness_runtime.md).

## Launch-Time Identity

Public launch input contains `teamDefinitionId`, one complete root Team default,
and one complete configuration for every exact direct-Agent address; callers do
not choose concrete run identities. `TeamRunService` canonicalizes workspace
roots, and `FlatTeamTopologyPlanner` validates the flat definition, coordinator,
exact Agent coverage, and definition bindings before
allocating a root TeamRun ID and direct AgentRun IDs. The result is one immutable
`TeamRunConfig`.

IDs are opaque runtime/storage identities. Names/slugs can improve readability
but must never be parsed for routing, task ownership, restore, or UI identity.
Provider-native Codex thread IDs and Claude session IDs remain separate from
local AgentRun identity. For current Team execution trees,
`platformAgentRunId` is an external-provider binding only. Native AutoByteus
continuation uses the local AgentRun ID plus its persisted memory state, and new
native nodes keep `platformAgentRunId: null`.

Member memory follows one placement rule (`AgentRunMemoryPlacement`). Direct
configured Agents are parts of the team run: the root TeamRun ID plus their
AgentRun ID (`run_part`, the only placement). A delegated run is a run of its
own: `memory/agents/<agentRunId>/`, or `memory/agent_teams/<teamRunId>/` with its
members inside it. `AgentRunMemoryLocator` resolves the path.
Consumers do not derive paths from logical addresses or provider IDs.

Required startup migration `20260823_repair_team_agent_memory_layout` contains
the only knowledge of the previously released nested-member memory defect. The
later required startup cutover
`20260901_agent_org_flat_team_families_v1` classifies prior fixed-depth Team V2
packages: native flat Team packages remain Team V2 without writes, while the
supported former multi-Team shape becomes the separate AgentOrg V1 family.
Current Team runtime and history remain target-schema-only.

## Execution Identity

Every concrete Agent command, status/event projection, task participant, token
owner, and frontend execution selection identifies a Team Agent by its AgentRun
ID, unique within the root TeamRun. Where the Agent sits (its rooted member
address) is recorded in the execution tree, not carried beside the ID.

## Runtime Composition Path

| Path | Authoritative owner | Member execution primitive | Notes |
| --- | --- | --- | --- |
| Current standalone Team run | `FlatTeamExecutionManager` | Each configured Agent owns one runtime-specific `AgentRun` | `ConfiguredAgentExecutionRegistry` holds the configured members; a run the team delegated to is a run of its own (autobyteus-461). |
| AutoByteus member | `FlatTeamAgentExecutionHandle -> AgentRunManager -> AutoByteusAgentRunBackendFactory` | Standalone AutoByteus `AgentRun` | `composeNativeAutoByteusPrompt` consumes `MemberTeamContext` and emits Team Instruction plus AgentTeam Addressing/Collaboration before native guidance. |
| Codex or Claude member | `FlatTeamAgentExecutionHandle -> AgentRunManager` | Standalone Codex or Claude `AgentRun` | `composeSharedCarpenterPrompt` projects shared Team Instruction plus AgentTeam Addressing/Collaboration through provider instruction boundaries. `get_handoff_rules`, `send_message_to`, and `delegate_task` remain automatically exposed through Agent Tools MCP; task tools never are. |

## Durable Member Activation And Restore

Root create versus restore intent is explicit process-local materialization
state. `AgentTeamRunManager` passes it through `FlatTeamExecutionFactory` and
the configured-Agent registry; handles do not infer a restored native run from
`platformAgentRunId`. That intent governs a handle's first activation only.
After the handle has published an AgentRun once, any later re-activation plans
as `restore`, for example a message to a member whose runtime died. The planner
receives the mode per attempt. A crashed external member therefore continues its
persisted provider conversation, and a native member restores its context. A
failed first activation keeps the original mode.

Before a candidate is built, a handle canonicalizes and reactivates the
persisted workspace through `WorkspaceManager.ensureWorkspaceByRootPath(...)`.

Each configured Agent handle owns one readiness attempt. Concurrent commands
join that attempt. `AgentRunManager` returns a private activation candidate that
is not visible through active lookup and has no input/event surface until the
governing durability step succeeds:

- At first work, a configured external member carries the complete
  `CollaborationAgentPlatformBindingChange` through the root-owned callback.
  `RootTeamRun.commitAgentPlatformBindingChange` commits against the current
  tree under its persistence lock before local cache update, candidate
  publication, or input acceptance.
- A restored external member with real conversation activity continues its
  exact persisted provider binding. Activity with a null binding fails closed,
  not by creating a replacement. Codex resume has no start-thread fallback;
  Claude resumes the same preselected UUID.
- Verified absence of conversation activity permits a new provider conversation.
  A retained non-null empty-conversation binding is replaced only after an
  expected-old comparison in that same durable root boundary. Unreadable
  activity never permits replacement. This uses the current storage format;
  no migration or reset is needed.
- A restored native member with canonical prior activity restores the same
  local AgentRun ID, memory directory, and WorkingContext. A restored native
  member with no activity may create fresh. Native members never stage or adopt
  a `TeamAgentPlatformBinding`; unreadable activity or restore failure fails
  closed.

A failed pre-durability attempt aborts the private candidate and is retryable
only after cleanup is confirmed. An indeterminate durable write, publication
failure after durability, or uncertain candidate cleanup fail-stops/quarantines
the owning root or run instead of admitting duplicate work.

Task delegation receives narrow capabilities from
`createTaskExecutionIdentityCapabilities(...)` rather than an Agent manager or
allocator object. The task path may allocate and inspect only the identities it
needs, preserving the same General Process versus Application execution-family
boundary used elsewhere.

## Stopped Team Model Configuration

`AgentTeamRunManager.updateStoppedSelections(...)` owns General Process
updates to persisted Team **selections**: agent runtime, model and model settings. It runs inside the same root transition
lane as restore, rechecks that no root remains manager-owned, rejects archived
or non-cataloged packages, and writes the current execution tree through the
existing atomic tree store. Save-first therefore makes the new values visible
to the next restore; restore-first returns `RUN_ACTIVE` without writing.

Each patch targets the root Team address `/` or one exact direct configured
Agent address. `team-run-selection-mutator.ts` resolves that address in the
stored tree and replaces only the scope's agent runtime
(`runtimeKind`), `llmModelIdentifier` and `llmConfig` in `defaultLaunchConfiguration` or
`launchConfiguration`. The three fields are required; `llmConfig` may explicitly be
null. It cannot change workspace, automatic-tool policy, concrete run IDs, task
nodes, hierarchy, or addresses.

The runtime follows the one rule `applyRuntimeSelection`
(`run-history/domain/runtime-selection-rule.ts`, shared with a standalone Agent run and
with every delegated run, which is an ordinary run): the member's own agent runtime is a model-only edit; another agent
runtime is an **agent runtime switch** (the member keeps its run, chat and history; its
`platformAgentRunId` becomes `null` and a `pendingRuntimeSwitch { switchId, from }` is recorded
on the member); the previous agent runtime again, while a switch is pending, is its undo.
Every member whose effective agent runtime changes gets its own pending switch, including
the members linked to a Team default that switched. The Team root's own default launch has no
run and never holds one. The save touches no running state.

The switch is made real when the member is next activated
(see [Agent runtime switch of a member](#agent-runtime-switch-of-a-member)).

Every intended scope validates before the single tree write: the same agent runtime against
its original saved selection, another agent runtime as a fresh selection of it
(`selectionContextFor`: the stored model counts as the current one only on the member's own
agent runtime and while no switch is pending). A
replacement needs fresh runtime-catalog membership and valid target-schema
settings. AutoByteus additionally needs verified positive non-decreasing
context capacity; external runtimes do not. Same-model settings skip the
AutoByteus replacement-capacity comparison only. An incompatible descendant blocks
the whole Save; it is not silently omitted. See
[LLM Management](./llm_management.md#persisted-run-model-selection-validation).

The browser may plan bounded propagation from a parent edit, but the server
receives the resulting exact-scope patches (`selectionPatches`, each with its
`runtimeKind`) rather than inheritance intent. The
planner links direct Agents using draft-start runtime/model/settings equality.
It preserves Agents that started divergent or were edited directly, even when a
later direct edit equals its parent. Mixed-runtime Agents do not link,
and stopped-run editing exposes no Reset-to-definition action because the V2
snapshot does not preserve original override provenance. No configuration
revision, rebase, or cross-client merge protocol is part of this boundary.

Post-write canonical read uncertainty returns `PERSISTENCE_INDETERMINATE` with
the last known tree; it does not claim a definite failure or issue a rollback
write. Canonical verification/Retry locks duplicate Save and clears obsolete
feedback after a successful read. Save does not start members or rewrite their
history/compaction state. Normal subsequent member messages restore the saved
pairs within the same local/provider conversations.

Studio checks the separate Application ownership lease before delegating to the
General root lane. A nonterminal Application binding keeps both Agent and Team
resume reads locked and direct stopped updates at `RUN_ACTIVE`; terminal release
restores ordinary General eligibility. See [Run History](./run_history.md) and
[Application Orchestration](./application_orchestration.md).

### Agent runtime switch of a member

A Team member (a standalone Team's, or an Org's direct Agent or mounted-Team Agent) with a pending switch is
switched at its next activation, in `ConfiguredAgentExecutionHandle.initializeReady`
(`agent-collaboration/execution/backends/`), the one activation class of every configured member. Its order is `begin` → prepare → `record` → commit → publish:

1. `ConfiguredAgentActivationPlanner.beginSwitch` decides from the member's raw traces. With a conversation, the one
   `RuntimeSwitchMemory` port (`begin`) takes a ticket first (the switch and the watermark; nothing is written). With no
   conversation, the member starts plainly: no marker, no archive, no notice. A history that cannot be read fails closed.
2. A fresh session of the new agent runtime is prepared and validated (its candidate may write records of its own).
3. `record` archives the previous agent's records through the watermark as one `runtime_switch` segment and starts the
   active file with the hand-over marker (same records, key and idempotence as for a standalone Agent run; see
   [Run History](./run_history.md)).
4. The `runtime_switch` platform-binding commit `{execution, switchId, platformAgentRunId | null}` goes to the root that
   owns the tree (`RootTeamRun` through `TeamAgentPlatformBindingCommitter`, `AgentOrgRun`, `StandaloneAgentRunRoot`), which
   sets the session and removes the pending switch in one tree write. A stale `switchId` or a missing member is a conflict,
   never a silent no-op; a conflict fails the activation.
5. The candidate is published.

`discard` runs only after the failed candidate's release is confirmed, so a failed attempt leaves the previous agent's file as it
was; a failure after the marker leaves the member pending, and the next message completes with one marker and one segment. After a
commit every holder of the member's launch drops the pending switch and takes the new binding: the handle's spec and session ID,
the Team wrapper's configuration and `FlatAgentExecutionContext`, and the root's tree.

## Exact Member Identity And Commands

The root ID must match the bound TeamRun. A configured member address must name
one direct Agent in the flat root. Missing, stale, or mismatched identity fails
closed. There is no fallback to the coordinator, a structural template, route
key, name, task instance ID, generated browser identity, or first matching
leaf.

## Team Commands

The Team WebSocket accepts strict command DTOs from
`@autobyteus/team-stream-contracts`:

- `SEND_MESSAGE` carries content/context attachments, `message_id`,
  `dedupe_key`, optional `@` mentions, and the target member's `agent_run_id`;
- `INTERRUPT_GENERATION` carries `command_id` and the `agent_run_id`; and
- `APPROVE_TOOL` / `DENY_TOOL` carry invocation ID, reason, and the
  `agent_run_id` emitted with the pending tool call.

A run ID that is not a member run of the connected root is refused with
`INVALID_TARGET`.

`AgentTeamStreamHandler` parses the DTO, verifies the root, and calls
`TeamRun.executeMemberCommand(...)`. `FlatTeamExecutionManager` dispatches to the
selected configured Agent. Send may restore the root Team container as part of the
supported Team follow-up path. Interrupt and tool decisions are active-only and
must not restore stopped work. A command to a run the team delegated goes to that
run's own stream (rule 2: its row opens it as its own run); a peer's run is reached
on its node (`/ws/peer-run`).

Interrupt acknowledgement is command-correlated. The server echoes the exact
client `command_id` and execution address with `accepted`, `rejected`, or
`failed`; accepted means the runtime accepted the interrupt request, not that a
terminal status has already been projected.

## Root And Agent Lifecycle

Flat Team preparation is always scope-only: it builds the TeamRun and its
member contexts but never starts a member. This holds for every Team kind with
no option to opt out: fresh and restored standalone Teams (a delegated team run
is one), and Org-mounted Teams. The full configured topology is available, but
configured Agents remain unstarted and Offline until required by work.
Restore retains its mode, member identity, history and saved provider binding;
Offline does not mean that a retained member has no history or binding.
The first supported input or peer delivery activates only its exact receiver;
selecting a row or publishing the root is not worker startup. Concurrent first
inputs for the same member share one readiness attempt. Different members
prepare independently and serialize only their root persistence mutations.
This is an execution policy, not a UI color/status override.

A delegated team run therefore starts only its coordinator, when the work
packet is delivered to it (the seed). Every other member has no AgentRun, no
provider session and a `null` saved `platformAgentRunId` in the execution
tree, and shows Offline, until work reaches it; its binding is adopted into the
tree when it starts. If the coordinator cannot start, the seed fails and
`delegate_task` fails as for any seed failure.

A member's start for an input (`ConfiguredAgentExecutionHandle.startForInput`)
is one step shared by both input entry points: teammate delivery
(`reserveInput`, used by `send_message_to` and handoffs) and direct input
(`postMessage`, used by the delegated seed and user or application input). If
the member cannot start, each audience gets one outcome:

- the sender gets a not-accepted result with code `AGENT_RUN_ACTIVATION_FAILED`
  (`{reserved: false}` for a reservation, `{accepted: false}` for a post). The
  message carries the cause as `<underlying code>: <message>`, for example
  `AGY_MODEL_UNAVAILABLE: …`; the underlying code is not the result code;
- the member's status shows `error` with the cause; and
- the member's conversation gets one error card (the `readiness_failure` event,
  emitted once per failed start attempt and adapted to an `ERROR` presentation
  event).

Input closed for the member at that moment (Task DONE, root shutdown) is not a
start failure: the sender gets `AGENT_RUN_NOT_ACCEPTING_INPUT` with the closure
reason, with no `error` status and no error card. A failure while the member's
run is already active is unexpected and is thrown, not reported this way. This
contract is the same for every Team and Org run, delegated or not.

An uncertain commit or post-durability local/publication failure is nonretryable
until safe root reopen; a definite failed write can retry after confirmed cleanup.
Reopening is a safety/reconciliation boundary, not permission to replay an old
message automatically. Distinguish a pending send whose admission was lost from
an input already accepted before process loss. Inspect canonical state and use
the existing deliberate-input path; do not infer acceptance from frame deliveries
across multiple browser tabs or from an unchanged status color.

`AgentTeamRunManager` alone owns root Team liveness. Its lookup vocabulary is
deliberately precise:

- **active** means `getActiveTeamRun(...)` can return a command-capable root;
- **managed** means `getManagedTeamRun(...)` / `hasManagedTeamRun(...)` still
  owns the exact root while it is active, initializing, stopping, or retained
  after a nonterminal Stop failure; and
- **terminal inactive** means the exact root is no longer manager-owned.

The public `TeamRunLifecycleSnapshot {teamRunId,isActive}` and Team history
`isActive` projection represent manager ownership, so they remain true while
Stop is pending and become false only after exact unregister. This public
"active" state must not be confused with an individual member doing work or
with the narrower command-active lookup. Active-to-active replacement does not
flicker false/true, stale cleanup cannot deactivate a replacement, and accepted
termination publishes terminal inactive only after exact unregister.

Root `TEAM_RUN_LIFECYCLE`, transport connection state, exact Agent
`AGENT_STATUS`, command overlays, delegated-child liveness, and open work are
separate facts. Initial Team streaming subscribes to events and manager
lifecycle before reading fresh snapshots, then publishes exact Agent status and
root liveness without synthesizing one from the other.

Team Agent status has two deliberately distinct strict projections. The initial
`TEAM_EXECUTION_VIEW_SNAPSHOT.agent_statuses` entries carry both
`agent_run_id` and snapshot-only `member_address`, while a sequenced live
`AGENT_STATUS` carries `change_sequence`, `agent_run_id`, and status details
without `member_address`. Both shapes share only a private status-details
mapper and are parsed by their respective `@autobyteus/team-stream-contracts`
schemas. `RootTeamRun` and `TeamRunEventPublisher` remain the only live change
sequence authority; a live projector must never reuse the structural snapshot
DTO or fabricate an address after sequence assignment.

Each executable member handle owns its pending command overlay. It can publish
`initializing` before slow Agent startup/restore/provider send work and replaces
or clears that overlay only through matching runtime status, command failure,
termination, or disposal. AgentRun remains the authoritative turn/status and
segment-lifecycle owner after command handoff. It also owns ordinary input
admission: a valid member command or peer delivery can be accepted into the
exact AgentRun FIFO while another turn is active without a provider-specific
busy rejection. Codex may append to the exact active turn when AgentRun selects
that capability; AutoByteus and Claude wait for a later turn. Team managers do
not own another input queue or infer this policy from provider state.

### Delegated Team Runs (Local Or Started By A Peer Node)

A delegated Agent Team runs here as an ordinary top-level Team run rooted at
`/` (TC-12): it is in run history and can be opened, watched, configured and
stopped. `DelegatedRunStarter` creates it through `TeamRunService.createTeamRun`
with each member's resolved launch and `delegatedFrom` `{delegatingRun,
delegatorAgentRunId}` (plus `nodeId` when a peer started it, through
`RemoteTeamRunStarter` with the temp workspace and auto-approve on), which the
root manager keeps on the tree (`team_run_execution_tree.json`, tolerant read:
absent means a run the user started). Only the coordinator starts, when the
work packet reaches it; the others start when work reaches them. A member
reaches its teammates by their own addresses (`/designer`), and the standing
agents of the run that assigned its Task by theirs (contract §2.3 step 2).

A peer-started team's root builds its remote links from the tree: the delegator
is a `delegator` endpoint paired with every member.

A delegated team root (local or peer-started) has an idle shutdown, which a
team the user started does not have:
`DelegatedTeamIdleShutdown` (`services/delegated-team-idle-shutdown.ts`). It is a
**quiet** shutdown, never the user Stop:

- it arms on the delegated-child schedule's signals and grace setting
  (`AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS`): an agent of the root
  reports `idle`, `offline` or `error`, a background task ends, or a live lease
  is released; it also arms once when the root opens, so a Team that never gets
  work stops; an agent `running` or `initializing` cancels it;
- on fire, `RootTeamRun.shutDownIfQuiet()` decides inside the root's gate: it
  skips while the root has open child work or a live lease, and otherwise calls
  the Team's own all-or-nothing `TeamRunBackend.tryPrepareTerminationIfQuiescent()`
  A member waiting for tool
  approval or with a running background task is not quiet, so nothing happens and
  a later quiet signal re-arms;
- a prepared termination is committed and the root ends as a Stop ends: the
  manager unregisters it, keeping the package, catalog row, tree and history. No
  member is interrupted.

The next message restores it (`TeamRunService.resolveManagedTeamRun`; for a
peer, after the stored-link check) and wakes the member it is for.

## Stop, Retained History, And Later Delete

The root lifecycle and stored-history lifecycle are intentionally separate:

1. A manager-owned root, including a root whose configured members all report
   `offline` or whose Stop is pending, exposes **Stop** only. Member status is
   not root terminality and never authorizes deletion.
2. Stop targets the exact root TeamRun ID, closes new materialization admission,
   joins work already admitted, freezes the root, interrupts active turns before
   quiescence, and terminates every materialized member. The runs the team
   delegated to are runs of their own and keep working (CM-7). Each published Agent member delegates
   reversible preparation and committed finish to
   `AgentRunManager.prepareAgentRunTermination(expectedRun)`; a cancelled or
   rejected finish retains its active run/session, while an accepted finish is
   not visible as success until exact-current removal and resource/session
   cleanup complete. The member handle disposes only after that accepted
   managed finish and owns no parallel Agent Tools cleanup path. A member whose
   runtime already died is no longer published by `AgentRunManager`. Its
   resources were released on inactive discovery, so its handle treats the root
   fence and termination as already complete. The root still fences the handle
   first, so shutdown never re-activates it. Stop retains the package, catalog
   row, execution tree, communication history, context, and resume identity.
3. The root remains managed and the lifecycle/history projection remains
   `isActive: true` until that whole scope reaches accepted terminal completion
   and the manager unregisters the exact root. A failed Stop retains the same
   managed root and history for retry; it does not make Delete available. A
   failed attempt, including a failed frozen-scope fence or finish, is never
   cached, so a retry re-runs it. Restore of a root that is still managed but no
   longer active (stopping or fail-stopped) first completes that root's
   termination inside the restore transition, then restores it. If termination
   still fails, restore reports `TEAM_RUN_STOP_INCOMPLETE` instead of "already
   managed". `TeamRunService.restoreTeamRun` has no separate pre-guard; the
   manager decides.
4. Only the later terminal-inactive `READY` history row exposes **Archive** and
   **Delete**. Delete is a new user decision with permanent-deletion
   confirmation; Stop never opens that confirmation and never invokes Delete.
5. `TeamRunHistoryService.deleteStoredTeamRun(...)` delegates physical removal
   to the history catalog. Archive, unarchive, and delete acquire the catalog
   queue before `AgentTeamRunManager.withInactiveHistoryMutation(...)` checks
   the exact root inside the same transition lane as restore. Active or stopping
   roots are rejected; compensated storage failure preserves a truthful inactive
   retry target.

Thus the supported journey is `Stop -> terminal retained inactive history ->`
an optional, separately confirmed `Delete`. There is no combined
stop-and-delete command, mutation, modal, or transport operation.

## Server-Owned Task Delegation

The rules are defined in the [Collaboration Model](../design/collaboration_model.md) (CM-1, CM-2, CM-6, CM-7); this document describes the mechanics.

The only first-party delegation tool is `delegate_task`. Delegation is a pure
spawn: it starts a fresh child and hands back its ingress run ID. It creates no
separate delegation task-record/submission/review/settlement subsystem. Optional
Project Task linkage uses the existing business Task authority; the retired
`submit_task_result` / `review_task_result` tools, the task-records file, the
delegation task GraphQL/REST APIs, and their task UI no longer exist. The current
Projects APIs/UI are separate and are not retired. Legacy task-plan tools
and runtime-specific delegation protocols are not part of this surface, and
legacy configured tool names are ignored.

`delegate_task` accepts:

```text
{
  recipient_address,
  description,
  reference_files?
}
```

Alternatively, `{recipient_address, task_id}` selects saved Project Task work.
`task_id` names a Project Task by its key (`autobyteus-42`, any letter case) or
its stored long ID. The Task side resolves it once in `resolveAssignment`, which
returns the stored `taskId` (the only identity used for linking, assignment and
run resources) and the key (`taskReference`, used in agent-facing texts). A Task
with no Project or an unknown reference fails with `TASK_NOT_FOUND`.
The parser rejects mixed description/reference overrides and a caller
`project_id`. Described delegation without an ID keeps the contract above. Only
non-owned runs, such as the Manager, may pass a `task_id`. A Task-owned run
that does so is rejected with `TASK_AGENT_RESOURCE_OWNED_SENDER`. The saved
text and context, the assignment record and permanent DONE closure belong to
the [Project Task agent run resources contract](projects.md#saved-id-delegation-and-agent-run-resources).

The address uses the same canonical absolute non-root `/...` grammar as
`send_message_to`; relative addresses, bare names, and the structural root `/`
are invalid. `RootTeamRun.resolveDelegationPlacement` returns one immutable
Agent or AgentTeam placement: first the CM-1 refusal (an address in the sender's
own team: its own address, a teammate, or in a Team root any configured root
placement, for a configured member; `COLLABORATION_SELF_TARGET_REJECTED` with
`send_message_to` guidance, or for its own address "you can't delegate to yourself"
(autobyteus-435), raised before any placement or Task link), then a
configured member, then a listed catalog definition (see
[Agent Communication](./agent_communication.md#delegated-catalog-runs)). Every
placement carries the launch its run starts from (a configured member's as it is
now); the new run records it in its own file. An address that is none of these returns
`{ delegated: false, message }` rather than failing the call. Input and
admission failures (`VALIDATION_ERROR`, `INVALID_REFERENCE_FILE`,
`ROOT_RUN_NOT_ACTIVE`) are tool errors raised before any preparation.
`resolveMessageRecipient` (used by `send_message_to`) only resolves: the sender's
own Team instance, then a configured member; one execution per address, never a
new run.

### Delegated Runs Of A Team Root

A Team root hosts nothing it delegated to (autobyteus-461). A catalog Agent or Team
reached with `delegate_task` is a new run of its own, started by `TaskDelegation`
through `DelegatedRunStarter` and recorded only in its Task entry (`delegatedFrom`
naming this team run and the delegating member, `recipientAddress`). The team's
tree holds its own members only; an older tree's `taskExecutions` list is read as
an unknown field and never written. `TeamExecutionIndex` records the configured
members; its `isOwnTeamAddress` (DEC-008) is true for the sender's own address,
any address inside a team instance that contains the sender at any depth, and,
for a configured member, every configured root placement.

**Member collaboration scope (CR-001).** One owner,
`agent-collaboration/execution/domain/member-instance-scope.ts#resolveMemberCollaborationScope`,
decides every member's outgoing handoffs and enclosing instruction in all three roots, at
construction and restore: a direct member of its non-root Team instance gets that
instance's handoffs and Team instruction; a root-level member at a configured root
placement gets the root's handoffs and instruction.

The root's message and delegation addressing lives in `services/team-run-message-delivery.ts`
(`TeamRunMessageDelivery`), called inside the materialization gate:
`send_message_to(address)` resolves with the shared `MessageRecipientResolution`
(the sender's own Team instance first, then run-wide placements); for a delegated
team, a miss continues in the sender's `CollaborationTree` (`resolve`): an address
written under the team's delegated name is refused with the address to use first,
then the standing agents of the run that assigned its Task (see
[Agent Communication](./agent_communication.md)); anything else is `COLLABORATION_TARGET_NOT_FOUND`
and nothing is created. `delegate_task(address)` uses the shared
`resolveDelegationPlacement` (CM-1 refusal, configured placement, then a catalog
placement). `@` itself adds nothing. `listAvailableAgents(sender)` is read-only and
takes no gate.

A successful Agent target creates one agent run. A successful AgentTeam target
creates one team run rooted at `/` and sends the work packet through that Team's
coordinator; only the coordinator starts, and the other members start when work
reaches them (see [Root And Agent Lifecycle](#root-and-agent-lifecycle)). The work
packet is the new run's first input: the delegator's address and AgentRun ID, the
description (for a saved Project Task, followed by its comments; see
[Saved-ID Delegation](projects.md#saved-id-delegation-and-agent-run-resources)),
and any reference files. The result is a strict union:

```text
{ delegated: true, target_kind: "agent", target_agent_run_id: "<agent run ID>" }                 // an agent run
{ delegated: true, target_kind: "team", target_team_run_id: "<team run ID>",
  target_team_coordinator_agent_run_id: "<its coordinator AgentRun ID>" }                         // a team run
{ delegated: true, target_kind: "agent", target_agent_run_id: "…", task_id: "ad_hoc_task_…" }     // Task created
{ delegated: false, message: "<why nothing started>" }
```

The result names each ID for what it is: a team run's ID (to give it a later Task)
and its coordinator's agent run ID (to message it). Internally the roots return a
`TaskDelegationOutcome` and only the tool layer serializes it.

`delegate_task` can also give a saved Task to an **existing** run by its own ID
(`{target_team_run_id | target_agent_run_id, task_id}`): `TaskDelegation.toExistingRun`
resolves the Task first, links the run to it, and sends the Task's work as a
`task_assignment` message from the delegator through `CrossRunMessageDelivery`, which
wakes the run with its conversation. See
[Follow-up Task to an existing copy](projects.md#follow-up-task-to-an-existing-copy).

`task_id` is present only when the delegation created a Task with no Project:
a description-only `delegate_task` from an agent that is not working on a Task.
Every delegated run therefore belongs to a Task (`assigned`: the Project Task or
its own ad-hoc Task; `subWork`: its delegator's current Task), and an agent that
selected `update_task` closes it with `update_task({task_id, status: "DONE"})` (see
[Projects](./projects.md#tasks-with-no-project-ad-hoc)).

After delegation, parent and child talk only through `send_message_to` with run
IDs, in both directions. `recipient_address` identifies the definition to
instantiate; it is kept as the Task entry's `recipientAddress`, never an alias for
the new run.

## Delegated Run Lifecycle

A delegated run's life is bound to its Task, never to the run that delegated to it
(CM-7). Which runs belong to a Task is recorded only on the Task side, in that
Task's `agent_run_resources.json`; the in-memory `DelegationIndex` relates the runs.
DONE or CANCELLED stops the Task's runs that have no other open Task, each through
its own ordinary Stop (`TaskRunControl`); a peer's run is fenced, not stopped. While
a run's Task is closed it receives no input except its assigner's continuation:
after the agent reopens the Task, the run that assigned the work messages the run's
ID and it continues with its conversation (see [Reactivation](projects.md#reactivation)).

- **Idle shutdown.** Every delegated run has its own: `DelegatedRunIdleShutdown`
  for an agent run, `DelegatedTeamIdleShutdown` for a team run (above). Each arms a
  grace timer on `idle`, `offline` or `error`, on a background task's end and on a
  live-lease release; `running` or `initializing` cancels it. A run waiting for tool
  approval, or whose runtime reports a running background task, is never quiet.
- **Grace period.** The server setting
  `AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS` (default 600 000 ms = 10
  minutes; accepted range 60 000–86 400 000 ms) is a predefined editable server
  setting. It is read at arm time, so a change applies to the next quiet moment.
- **Wake-on-message.** A message to a stopped run restores it with its
  conversation, as for any run (`CrossRunMessageDelivery`, then the run's own root).
- **Stop.** The run's own Stop, from its own view or a child row of the delegating
  run's view; the runs it delegated to keep working.
- **Restart.** Every run is its own root after a restart; after an update, busy
  runs are woken bottom-up along `delegatedFrom` (see [Restart Resume](restart_resume.md)).

## Collaboration And Handoffs

Each Agent receives one `MemberTeamContext` containing:

- exact `TeamMemberExecutionIdentity {rootTeamRunId,memberAddress,agentRunId}`
  for rooted execution identity and logical collaboration placement;
- that Agent's outgoing handoff rules, read live from the run's membership
  (`MemberCollaborationContext.outgoingHandoffs()`; see
  [Membership Follows The Definition](#membership-follows-the-definition));
- optional Team instruction; and
- active delivery/tool service bindings.

After optional authored `Team Instruction`, the Carpenter prompt renders the
collaboration sections for the member's `collaborationRole`
(`src/agent-execution/prompt/collaboration-prompt-sections.ts`; see
[Prompt Engineering](./prompt_engineering.md#collaboration-sections-by-role)). A
member of a user-started team (`team_member`) gets `AgentTeam Addressing`
(the absolute non-root address rule and the Team coordinator ingress rule) and
`Working With Other Agents` for a team member: its teammates are reached by
address with `send_message_to`; a task is delegated with `delegate_task`; every
message received names its sender and ID and is answered by ID. A `Handoffs`
subsection with the agent's possible rule-based handoffs is added only when the
agent has handoff rules; the agent selects the single rule whose condition most
specifically applies and notifies only that rule's recipient. No section tells
an agent its own address, and none injects a flat recipient, representative, or
delegation roster. The role is decided once by
`resolveMemberCollaborationScope` and stored on the member context.
Runtime exposure automatically includes `get_handoff_rules`, `send_message_to`
and `delegate_task` for a valid Team context, with identical copy across
AutoByteus, Codex, and Claude.

`send_message_to.recipient_address` resolves through the root logical placement
service, the sender's own Team instance first: a teammate address inside a
mounted Team reaches that same instance's member (REQ-007). An Agent target delivers to that real Agent. An AgentTeam target
delivers through its exact direct coordinator ingress. Child managers forward a
root-bound delivery intent without rewriting the sender/receiver into flat or
representative identities. Team Communication persists the actual sender and
receiver AgentRun IDs; explicit `reference_files` are
structured metadata and natural message prose is not scanned for paths.
The message is saved to the Team's log before the target AgentRun may run it,
through the one [teammate delivery path](./agent_communication.md#teammate-delivery-path):
`RootTeamRun` builds its `RootCommunicationPort` (`team-communication-port.ts`:
the Team recipient builder, `TEAM_*` codes, `COMMUNICATION` then `MEMBER_INPUT`
events) and `TeamRunPersistenceCoordinator.commitMessageAppend` does the locked
write. An accepted delivery is projected once, when the saved message is
committed to the target AgentRun; later provider forwarding or terminal
observation does not publish a duplicate Team Communication or member-input record.

Successful logical messaging returns that existing Agent or AgentTeam
coordinator run as flat `target_agent_run_id`; rejection returns null identity.
A run ID never creates an execution, and a message never starts an agent: an
address that is not a placement is refused with guidance to use `delegate_task`
(see
[Agent Communication](./agent_communication.md#address-resolution-order-messagerecipientresolution)).
A successful `delegate_task` already
starts the child and delivers the complete assignment to its fresh ingress.
Callers must not resend the assignment through logical-address messaging; all
later exchange with the child, in both directions, uses its agent run ID (a
team run's coordinator). A team run's ID is refused by
`send_message_to` (`TARGET_IS_TEAM_RUN`) with the coordinator's run ID to use.

`target_agent_run_id` is the exact AgentRun route owned by
`src/agent-communication`. `GlobalAgentRunMessageRouter` sends a run-ID target
that is one of the sender's own team's members through the root
(`deliverExactAgentMessage`): it also reaches a not-yet-activated configured member
(which then activates lazily), and is recorded as ordinary Team Communication. Any
other run of this node goes root to root (`CrossRunMessageDelivery`): a run a Task
relates to the sender's run is woken with its conversation when stopped, any other
only while it runs, never woken (CM-13, autobyteus-492; see
[Agent Communication](./agent_communication.md#target_agent_run_id-global-direct-route)),
and with `node`, the run of a paired peer goes through the peer path. A target the
cross-run path does not reach (a sender or target without a collaboration root) uses
the global live-only path, which rejects an inactive target with
`TARGET_AGENT_RUN_NOT_ACTIVE`.

## Canonical Team Events And WebSocket Projection

Flat Team Agent execution handles subscribe to post-pipeline `AgentRunEvent`s, verify
the real AgentRun binding, and call the sole
`createTeamAgentExecutionBinding(...)` constructor. `TeamAgentEventAdapter` maps
the finite Agent event vocabulary into a correlated Team domain event and is
stateless with respect to turn, segment, task, and runtime lifecycle.

`FILE_CHANGE` admission follows the same strict boundary. The adapter accepts
only the canonical `AgentRunFileChangePayload` keys, requires its `runId` to
match the source `AgentRunEvent`, validates the finite artifact type, status,
and source-tool values, and preserves `sourceInvocationId` as a required
nullable field. It rejects legacy wire aliases, extra fields, invalid enum
values, and cross-run payloads before the Team projector allocates or emits a
wire event.

Every Agent-originated Team wire message carries the root's `change_sequence`
and the member's `agent_run_id`. The strict wire projection contains no member
path or name fields. Segment
start/content carry required turn, exact ID, and the finite canonical type;
segment end carries exact turn/ID plus terminal facts without repeating type.
Error events retain required nullable scope/effect/turn evidence. Invalid Team
input is rejected rather than repaired or routed by compatibility fields.

Team-only events retain their own strict identities:

- `ERROR` with `COLLABORATOR_ADD_FAILED` rejects a send whose `@` mention could
  not be resolved (an ineligible definition) and carries `collaborator_name`;
- `TEAM_COMMUNICATION_MESSAGE` carries the sender and receiver AgentRun IDs;
- `MEMBER_INPUT_MESSAGE` carries its recipient AgentRun ID, optional sender,
  stable message identity, origin, and context files; and
- `TEAM_RUN_LIFECYCLE` carries root liveness only.

Multiple WebSocket/API subscribers do not create duplicate runtime listeners,
pipeline passes, or projection writes.

A reconnect snapshot remains the recovery authority; the run's children (the runs
it delegated to, from their Task entries) are rows of that snapshot.

## Membership Follows The Definition

A Team run follows its Team definition while it exists: when the definition's
members, coordinator or handoff rules change, the run changes with it, live or
at its next restore. Which runs follow (D-SCOPE,
`membership/team-membership-planner.ts` `followsTeamDefinition`): a standalone
Team run, and a Team run copied from a Team definition (`copiedFrom:
"team_definition"`, local or started by a peer; a copy recorded before this field
existed follows too). An application-bound run (`applicationBinding`) and a copy
of a configured placement (`copiedFrom: "configured_placement"`) keep their
members. A Team mounted in an Org run keeps its Org's stored members.

- **Trigger.** `TeamDefinitionChangeListener` subscribes to the host's
  `AgentDefinitionChangeSignal` (package reload, app save, personal setting) and
  follows every live run, one after another, each contained: a run that fails is
  logged (`TEAM_RUN_DEFINITION_NOT_FOLLOWED`) and the others continue. Changes
  during a pass ask for one more pass.
- **Plan.** `TeamMembershipPlanner.viewFor` reads the definition at the run's
  own root and compiles its rules (`own_team`, or `delegated_team` for a
  copy). The pure `planTeamMembershipChange` compares members by address and
  agent definition: a member the definition no longer has, or with another
  agent at its address (a swap), leaves; a former member at the same address
  with the same agent comes back with its run ID; any other definition member is
  new, launched with its agent's default, else the run's own launch, both
  checked (a member that cannot be launched is not added; the next change tries
  again, `TEAM_MEMBER_NOT_ADDED`). A rule from or to an address that is not a
  member is left out. A definition that is missing or invalid, that the package
  loader could not read (it keeps the last good version; the run does not follow
  that either), or without a coordinator that can be added leaves the run as it
  is, warned once per run and reason (again after the definition was valid).
- **Commit.** `TeamMembershipCommitter` (inside `RootTeamRun`) plans again
  under the run's persistence lock, with the members whose execution is live
  (`FlatTeamExecutionManager.liveExecutionIds`, a synchronous read of handle
  state), writes the tree once, then swaps tree, index and `TeamRunMembership`
  together (`replaceTree`). Then, in order: the leaving members are asked to stop
  (`TeamRun.followMembership`), a removed member's stopped handle goes, each
  remaining member's notice is recorded, the run-tree rows are read again
  (`DelegationIndex.runPartsChanged`) and the run's view stream gets
  `TEAM_MEMBERSHIP_CHANGED_EVENT`. A durable write that cannot be applied live
  stops the run (fail-stop). An unchanged definition writes nothing and
  publishes nothing.
- **Membership.** `TeamRunMembership` is the one in-memory view: current
  members (launch nodes), coordinator, handoff rules, leaving members (the
  tree's `leaving` markers) and each member's runtime context. It changes only by
  `replace(committedTree)`. A retained member keeps its context object; a new
  member gets one; a member that comes back resumes its conversation.
- **Leaving.** A member removed while its execution is live is written to
  `formerMembers` with `leaving: true` ("removed with a live execution, not yet
  stopped"); one without a live execution is written former. A leaving member
  finishes its turn: its own approvals, denials and interrupt still work
  (`getAgentForOwnCommand`) and the messages it sends are delivered (`maySend`),
  but it receives nothing (`isCurrentAgent`). `FlatTeamExecutionManager` only
  stops it when it is quiet (an idle one at once) and reports the stop. The
  committer owns the release step: a locked write that clears the marker, then
  the swap (its context goes), its stopped handle's removal, the run-tree rows
  and the view event. A definite failure of that write keeps the marker, with a
  warning (`TEAM_MEMBER_RELEASE_NOT_SAVED`); every later plan clears a marker
  whose execution is no longer live. A run that stops while a member is leaving
  writes nothing: the marker reads as former outside a live run, and the restore
  clears it. A swap at the same address starts the new member while the old one
  finishes.
- **Former members.** A removed member is kept in the tree's
  `rootTeam.formerMembers` with its run ID and history (it stays in the run's
  history); it is not addressable. A message to it, by address (both resolution
  steps) or by run ID, is refused with
  `COLLABORATION_TARGET_NOT_FOUND` and the text `<name> (<address>) is no longer
  a member of your team: it was removed from the team definition. Call
  get_handoff_rules for your current handoff rules.` A run-ID message reaches
  that refusal because the router asks the sender's root `ownsAgentRun`
  (current, leaving and former members); `hasAgentExecution` keeps its meaning
  for restart-resume placement, which never places a former member.
- **Notices.** `TeamChangeNoticeSource` (a platform notice source) gives each
  remaining member one notice at its next input, stating the net change since
  its last delivered notice: `Your team changed: its definition was updated.`,
  one `Joined: <name> at <address>.` or `Left: <name> (<address>); messages to it
  are no longer delivered.` line per member, and whether its own rules changed
  (`Your handoff rules changed; call get_handoff_rules to read them.` or `Your
  handoff rules are unchanged.`). A member that joined hears nothing.
- **Rows.** The rendered member list is the run-tree `team_member` rows. One
  function, `teamMemberRowsOf(members, isLive)` in `run-tree-view.ts`, decides
  them for the run's own rows and for a Team copy's rows under its delegating run
  (both read `RunOwnAgentsReader.ownTreeOf`: the members, then the former members
  marked `leaving`): a leaving member is a row tagged `leaving` while the team
  run is live (`RunTreeSources.isLiveTeamRun`, the active root directory), and
  has no row otherwise. The web shows the tag "Leaving"; the row still opens the
  member, so its pending approval can be answered. When a team run with
  markers ends, the manager re-reads its rows after it left the active root
  directory, with no write.
- **Views.** An open Team view (`TeamViewSession`) re-enters its live mode on
  the membership event, which sends an in-band `TEAM_EXECUTION_VIEW_SNAPSHOT`;
  its members are the current then the leaving ones (`leaving: true`), from which
  the web keeps, adds and drops its agent contexts.
- **Restore.** `AgentTeamRunManager` restores a following run by planning its
  stored tree against the definition (`followStored`, which also clears every
  `leaving` marker: nothing of a stopped run executes), writing the change, then
  materializing; once registered, the change's effects run and the run follows
  the definition again live.

## Restore And Persistence

- `team_run_execution_tree.json` is the canonical runtime tree.
  Its single root Team stores a complete `defaultLaunchConfiguration`; every
  direct configured Agent stores a complete `launchConfiguration`.
- Stored handoffs are the rules compiled from the Team definition, as the run
  last followed it. A run that follows its definition (see
  [Membership Follows The Definition](#membership-follows-the-definition)) is
  brought up to date before it is restored; any other run keeps its stored rules.
- Stored concrete AgentRun/TeamRun IDs and provider resume IDs are data; public
  new-launch input cannot supply them.
- There are no persistent configured child TeamRuns. Delegated children are
  recorded in the execution tree with their concrete execution address, run
  IDs, `startedAt`, and (for children created since the resource lifecycle)
  `delegatorAgentRunId`. The tree is the only persisted authority for them;
  after reopen they start shut down and are woken on demand, unless their
  Task's agent run resources record them as closed. The tree itself holds no
  Task stamp. Task ownership comes only from the Task side.
- `TeamRunService.resolveActiveTeamRun(teamRunId)` is the supported
  restore-aware root lookup for Team connection/send flows. It may restore an
  unmanaged persisted root, but it returns no replacement while the exact root
  remains managed and is not command-active. Active-only controls use
  `getActiveTeamRun(...)`; owners that must observe a stopping/nonterminal root
  use `getManagedTeamRun(...)` or `resolveManagedTeamRun(...)` explicitly.
- Member memory paths are resolved through `AgentMemoryLocationService`; no
  manager, stream, browser, or history consumer reconstructs them from names or
  provider IDs.
- Every non-null persisted member workspace root is made active before create or
  restore candidate construction; valid persisted workspaces do not silently
  fall back to the temporary workspace.
- Accepted restored follow-up messages record activity without changing the
  stable opening/coordinator title.

### Startup Transition To The Current TeamRun Package

Current runtime, storage, history, GraphQL, and stream readers consume one
validated current package per root TeamRun:

- `team_run_execution_tree.json`; and
- its message log, `team_communication_messages_active.jsonl` plus sealed
  `team_communication_messages_<6 digits>.jsonl` files (append-only JSON Lines; see
  [Run History](./run_history.md), Message logs).

On disk a team run's tree holds its own parts only (autobyteus-461, CM-8): no list of
the runs it delegated to, local or on a peer (those are their Task entries), and an
older file's `taskExecutions` list is read as an unknown field and never written. A
delegated team run's tree is an ordinary team tree rooted at `/` with its
`delegatedFrom`, `copiedFrom` (what it was copied from, written once) and
`rootTeam.defaultLaunchSource`. Any team tree may hold `rootTeam.formerMembers`
(members removed from its definition; absent means none; their run IDs are unique
with the members', an address may repeat). Both fields are optional: a tree
without them is read as before, with no migration. `TeamRunExecutionTreeStore` has
`read`, `readSync` and `write` only. A message between the team run's parts is stored
once in its own log; a message with another run in both runs' logs; the package
validator requires one agent of each message to be an agent of the team run.

The execution tree is **read tolerantly and written exactly** (see the
[data migration guideline](../design/data_migration_guideline.md) section 3).
The reader requires the known required fields (`createdAt`, `archivedAt`,
`applicationBinding`, `handoffs`, `rootTeam`, and the required node, member,
launch-configuration, and task-execution fields), checks the invariants (unique
run IDs, canonical addresses, a unique coordinator, handoff endpoints, and a
present `delegatorAgentRunId` resolving to an AgentRun in the same tree), and
projects only known fields. `schemaVersion`, the retired `settledAt`, and any
unknown key are ignored and never reach memory or a later write. The writer
emits the exact current shape with no `schemaVersion`. An older tree is
therefore admitted as-is and loses those obsolete fields only when the runtime
next saves it for its own reasons. Handoff entries inside the tree remain
exact-key (`normalizeCollaborationHandoffs`). A preserved released V1 tree is
still rejected structurally, because its launch configurations use retired
`runtimeKind` values.

Released `task_delegation_records.json` files are neither required nor retired:
they stay untouched on disk and are never read. `TeamRunPackageCatalog` admits
only complete, valid current packages. A root that still contains predecessor
`team_run_metadata.json`, lacks a required package file, or has
invalid/unsupported content is excluded from normal runtime and history instead
of entering a compatibility path. `TeamRunStatePackageLoader` loads the package
for restore; delegated children come back shut down, with no repair step.
Runs closed by a Task's DONE remain permanently non-wakeable.

The required startup sequence has three distinct Team package stages:

1. `20260814_team_run_execution_tree_v1` classifies predecessor roots, converts
   released metadata/communication/task projections into a complete
   migration-owned V1 package, reconciles eligible history/token evidence, and
   leaves valid existing V1 packages unchanged. This stage owns all predecessor
   schema interpretation.
2. `20260823_repair_team_agent_memory_layout` uses that validated V1 intermediate
   to move unambiguous nested-Agent memory directories into the canonical
   root/ancestor-TeamRun/AgentRun layout.
3. `20260824_team_run_execution_tree_v2` transforms exact V1 trees to exact V2.
   It maps legacy runtime labels to current runtime values, sets the root address
   to `/`, preserves IDs, topology, Agent snapshots, tasks, handoffs, application
   binding, and timestamps, and materializes Team defaults from direct
   coordinator Agent snapshots.
4. `20260901_agent_org_flat_team_families_v1` performs the final fixed-depth
   split. Exact native flat Team V2 packages are validated and left in place;
   supported former organization-like Team packages move atomically to the
   AgentOrg V1 family. Unsupported or conflicting items remain unavailable and
   retry on the next startup; current readers never decode the retired shape.

The V2 migration is required on startup, has `ANYTIME` policy, and depends on the
memory-layout migration. Exact V2 files are idempotently skipped. Missing,
invalid, unsupported, or non-regular entries are reported with per-item
outcomes; current readers do not accept V1 as fallback. Each V1 candidate is
validated before transformation, the V2 candidate is validated before write,
and the canonical file is reread and accepted only as exact V2 after the shared
atomic writer returns. A post-rename finalization warning is isolated as a
warning only when the reread target is already valid V2; otherwise the item
fails and remains retry-visible.

These released migrations keep their released behavior on skip-version
installs. Where they classify shapes ("already current" versus "old") or read
released task-records files, they import frozen strict copies from
`src/app-data-migrations/frozen/released-run-package-shapes/` (Team tree V2,
Org tree V1, task-records V1, Org state-package V1), never the current tolerant
readers. Current runtime code never imports the migration area
(`tests/architecture/app-data-migration-boundaries.test.ts`). The delegated-child
resource lifecycle added no migration of its own.

The V1-to-V2 coordinator-derived Team default is a historical migration rule
only. New launches must provide complete `teamConfigs[]` and `memberConfigs[]`,
and every new tree node is built from those resolved values rather than inferred
from a coordinator. The dated configured-recovery branch is not a migration or
runtime input.

The execution tree owns Team identity, definition, creation/archive facts,
application binding, handoffs, the flat configured-Agent topology, delegated
child executions (with their delegator), and launch configuration. The Team history index owns
list-oriented summary and termination facts. Normal catalogs do not scan
predecessor metadata or manufacture missing packages. AgentOrg packages and
history indexes are documented separately in [Agent Organization](./agent_orgs.md).

## TS Source

- `src/agent-team-execution/domain/team-agent-execution-binding.ts`
- `src/agent-team-execution/domain/team-run-config.ts`
- `src/agent-team-execution/domain/team-run-execution-tree.ts`
- `src/agent-team-execution/domain/team-run.ts`
- `src/agent-team-execution/local/flat-team-execution-factory.ts`
- `src/agent-team-execution/local/flat-team-execution-manager.ts`
- `src/agent-team-execution/local/flat-team-run-backend.ts`
- `src/agent-team-execution/local/registries/configured-agent-execution-registry.ts`
- `src/agent-team-execution/local/registries/task-agent-execution-registry.ts`
- `src/agent-team-execution/local/registries/task-team-execution-registry.ts`
- `src/agent-team-execution/services/flat-team-topology-planner.ts`
- `src/agent-team-execution/services/team-run-service.ts`
- `src/agent-team-execution/services/delegated-team-idle-shutdown.ts`
- `src/agent-team-execution/domain/team-run-remote-links.ts`
- `src/remote-collaboration/inbound/remote-team-run-starter.ts`
- `src/agent-team-execution/services/agent-team-run-manager.ts`
- `src/agent-team-execution/services/team-run-execution-tree-mutator.ts`
- `src/agent-team-execution/services/team-run-persistence-coordinator.ts`
- `src/agent-team-execution/services/member-team-context-builder.ts`
- `src/agent-execution/prompt/collaboration-prompt-sections.ts`
- `src/agent-team-execution/services/inter-agent-message-delivery-intent-builder.ts`
- `src/agent-team-execution/services/member-command-status-overlay-store.ts`
- `src/agent-team-execution/services/team-agent-event-adapter.ts`
- `src/agent-team-execution/task-delegation`
- `src/agent-collaboration/execution`
- `src/agent-tools/task-delegation`
- `src/config/task-execution-idle-shutdown-setting.ts`
- `src/run-history/store/run-execution-tree-shared-record-schemas.ts`
- `src/run-history/store/team-run-execution-tree-schema.ts`
- `src/app-data-migrations/frozen/released-run-package-shapes`
- `src/agent-execution/shared/runtime-agent-tool-exposure.ts`
- `src/services/agent-streaming/agent-team-stream-handler.ts`
- `src/services/agent-streaming/team-agent-event-websocket-projector.ts`
- `src/app-data-migrations/migrations/agent-org-flat-team-families-v1`
