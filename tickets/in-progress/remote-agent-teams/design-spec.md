# Design Spec — Remote Agent Teams (autobyteus-247)

## Solution And Approval Basis

- Current solution revision ID: `SR-005`
- Approved requirements baseline: `requirements-doc.md` at SR-002 (approved by the User on 2026-10-21), with the data model refinement SR-004 (the User: "If you think this is cleaner, then do it like this")
- Behavior-defining supplements:
  - the contract `autobyteus-server-ts/docs/design/collaboration_model.md` (CM-10 … CM-12, § 3), updated in this branch (SR-003, SR-004);
  - `validation-cases.md` (rounds 1 and 2) as the evidence basis.
- Design status: `Ready`
- Canonical investigation notes: `investigation-notes.md`; validation evidence in `validation-cases.md`
- Authorities read: `references/architecture-design.md`, `references/design-principles.md`, `references/finding-the-cause.md`, `/DESIGN.md` (rules 1–9), `collaboration_model.md`, `data_migration_guideline.md` § 1–3; context: the designs of autobyteus-191 and 245 (`tickets/done/…`).
- Project design-principle conflicts: None.

## Current-State Read

- **Remote Agents work end to end (slice 1 + 245).**
  - A: a kinded remote link in the tree's `remoteTaskExecutions` (in memory); `RemoteRunLinks` with endpoint kinds `delegated_run` / `delegator`; `RemoteMessageSend`; `RemoteDelegation`.
  - B: `RemoteDelegationReceiver` resolves through `CollaboratorAdmission` with `NodeCatalogPort`, prepares a standalone run with `delegatedFrom`; `StandaloneHostIdleShutdown`.
  - Messages B → A carry `coordinatingRun`; A → B messages and work packets name only the target run, which B resolves as a standalone root (`remote-message-receiver.ts`).
- **What is single-agent-shaped today** (validation G-1 … G-9): one paired local agent per endpoint; target-root resolution on B; the existing-copy refusal; the closure fence lookup; the endpoint set; Team-run-ID guidance; the delegated-runs answer; no Team host on B; B refuses Teams.
- **Team facts (reproduced, validation P-1 … P-4):**
  - a Team run starts only its coordinator;
  - a not-started member starts on its first input;
  - members' run IDs are allocated at planning;
  - a Team run is restored by its ID;
  - idle shutdown and restore keep members restorable.

## Intended Change

Generalize the remote-run machinery from "a remote run" to "a remote Agent or Agent Team". B hosts a peer-started Team as a top-level Team run with `delegatedFrom`; A links it with its coordinator's address and its members. Every message names its receiving root. Every member is reachable and wakeable.

## Change Scope (Mandatory)

- In scope: UC-301 … UC-303; G-1 … G-9 (`validation-cases.md`).
- Deliberately left alone: local Team copies and Team runs; the Agent path's behavior; peers, the switch and the gateway order; the Task closure policy (fence only, S3); messages to unlinked runs (FU-001).
- Follow-ups: FU-001 (global send across nodes).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | REQ / AC | Target Path / Spine |
| --- | --- | --- |
| BEH-301 delegate to a remote Team | REQ-301, 303, 304, 307; AC-301 | DS-001 |
| BEH-302 refusals | REQ-302; AC-302 | DS-001 |
| BEH-303 messages with any member | REQ-305, 308; AC-303, 305 | DS-002, DS-003 |
| BEH-304 idle and restarts | REQ-306; AC-304 | DS-004, DS-002/003 restore |
| BEH-305 the Team on B | REQ-307 | DS-001 (B), history |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature` (generalization).
- Current design issue found: `Yes`. The remote machinery is single-agent-shaped in nine places (G-1 … G-9). The worst is the target-root rule on B: it is asymmetric (only B → A names a root) and true only by accident for standalone hosts.
- Structural triggers:
  - **Shared-structure tightness (principle 11): fires.** One paired agent per endpoint; a separate `coordinatingRun` used for one direction only.
  - **Ambiguous boundary (principle 10): fires on B.** The target run ID doubled as a root ID.
- Root cause classification: `Shared Structure Looseness`.
- Refactor needed now: `Yes`, bounded:
  1. every message and work packet names its receiving root (`targetRoot`), both directions;
  2. endpoints pair with a set of local agents;
  3. remote links are a kinded union.
- Design response: the decisions below; no other refactor.

## On-Disk Data Model

**Node A: the remote Team link**, inside the coordinating tree's `taskExecutions`, with `nodeId`:

```json
{ "address": "/StudentStudyGroup", "teamRunId": "…07a4…", "nodeId": "srv_B…",
  "coordinatorAddress": "/StudentStudyGroup/student_one",
  "members": [ { "address": "/StudentStudyGroup/student_one", "agentRunId": "student_one_64a6…" },
               { "address": "/StudentStudyGroup/student_two", "agentRunId": "student_two_d684…" } ],
  "delegatorAgentRunId": "agent_a1…", "startedAt": "…" }
```

- **Read:** the shared compose (`task-execution-tree-split.ts`) reads a `nodeId` entry with `teamRunId` as `{kind: "agent_team", …}` into the in-memory `remoteTaskExecutions`.
- **Validation:** `coordinatorAddress` must be among `members`, and `members` must be non-empty. Otherwise the link is left out with a warning naming the root (DESIGN.md rule 7; C-32, C-33).
- **Write:** written once at the activation commit; kept by the shared split.
- **In memory:** the Agent link gets `kind: "agent"`. The union `RemoteTaskExecution = RemoteTaskAgentExecution | RemoteTaskTeamExecution` is discriminated by `kind`.

**Node B: the Team run**, at `memory/agent_teams/<teamRunId>/team_run_execution_tree.json`. It is the normal Team tree plus a top-level optional `delegatedFrom: {nodeId, coordinatingRun, delegatorAgentRunId}` (the same type and parser as on `run_metadata.json`, `delegated-from-schema.ts`).
- Tolerant read: absent means not peer-started.
- The exact writer emits it when present; there is a key-set test.
- No `taskAgent` section: on B it is a root.

**Messages:** each node writes one line in its own log (A: the delegator's; B: the Team's `team_communication_messages`), with one message ID.

**Task record on A:** `agentRun: {kind: "team", teamRunId, coordinatorAgentRunId}`. The shape is unchanged: `dispatchTaskCopy` already writes it for a `{teamRunId}` target.

**Persisted-data decision:** `Not Affected`. New optional fields only; no migration.

## Contract Between Nodes (changes)

- **`targetRoot` (G-2).** Every `POST /rest/remote/messages` body (`kind: "message"` and `"work_packet"`) carries `targetRoot: {kind: "agent" | "agent_team" | "agent_org", runId}`: the root that receives it on the receiving node.
  - A → B: the remote run's root (an Agent: `{kind: "agent", runId: agentRunId}`; a Team: `{kind: "agent_team", runId: teamRunId}`).
  - B → A: the coordinating run (from `delegatedFrom.coordinatingRun`).
  - The message field `coordinatingRun` is removed. `coordinatingRun` stays in the delegated-runs request and in `delegatedFrom`, where it means "the coordinating run".
  - `RemoteMessageReceiver` resolves `targetRoot` by kind (`RemoteRootDirectory.standalone|team|org`): one rule for both directions; its branch on `coordinatingRun` is removed.
- **Delegated-runs answer (G-7):**
  - `{accepted: true, nodeId, kind: "agent", agentRunId}`;
  - `{accepted: true, nodeId, kind: "agent_team", teamRunId, coordinatorAddress, members: [{address, agentRunId}]}`;
  - refusals as in 245; `REMOTE_TEAMS_NOT_SUPPORTED` is removed.

## Data-Flow Spine Inventory

| Spine | Scope | Start | End | Owner |
| --- | --- | --- | --- | --- |
| DS-001 | Primary | A: `delegate_task({node, recipient_address: "/team"})` | B: a Team run with `delegatedFrom`, coordinator started by the packet; A: the result | A: `dispatchTaskCopy` / `RemoteDelegation`; B: `RemoteDelegationReceiver` + `RemoteTeamRunStarter` |
| DS-002 | Primary | A: delegator `send_message_to(member run ID)` | B: the member woken, the message admitted | A: root routing + `RemoteMessageSend`; B: the Team root's `acceptRemoteMessage` |
| DS-003 | Primary | B: any member `send_message_to(delegator)` | A: the delegator woken, the message admitted | B: the Team root's routing + `RemoteMessageSend`; A: the coordinating root's `acceptRemoteMessage` |
| DS-004 | Bounded local | B: the peer-started Team goes quiet | The Team root stopped (package kept) | `RemoteTeamIdleShutdown` |

```text
DS-001  A: delegate_task({node, recipient_address:"/software_engineering_team", description})
        → RemoteDelegation.delegationPlacement → dispatchTaskCopy → root adapter planActivation → RemoteDelegation.planActivation
        → PeerClient POST /rest/remote/delegated-runs {fromNodeId, toNodeId, address, delegator, coordinatingRun}
        B: PeerGateway → RemoteDelegationReceiver.start
           → catalogDefinitionAt(nodeCatalogPort, address): null → AGENT_NOT_FOUND
           → catalogTaskSourceOf(port, {ref, address}): NoDefault → NO_DEFAULT_RUNTIME (targetName) | AddError → AGENT_CANNOT_RUN
           → agent: prepareAgentRun (unchanged) | agent_team: RemoteTeamRunStarter.start(source, delegatedFrom)
               → TeamRunService.createTeamRun (resolved launches, temp workspace, auto-approve) with delegatedFrom on the tree
           ← {accepted, nodeId, kind:"agent_team", teamRunId, coordinatorAddress, members}
        A: target = {execution:{teamRunId}, ingress: the member at coordinatorAddress} → Task link (teamCoordinatorAgentRunId)
           → commit: Team link with nodeId → acceptSeed: work packet {targetRoot:{agent_team, teamRunId}, target: coordinator}
        B: Team root acceptRemoteWorkPacket (link check) → the coordinator starts with the task notification (node in the header)
        A: ← {delegated:true, target_kind:"team", target_team_run_id, target_team_coordinator_agent_run_id, node}

DS-002  A: send_message_to(member) → router → root.hasAgentExecution → RemoteRunLinks.endpointFor(member) (delegated_team)
        → RemoteMessageSend: allowsSender (delegator) → prepareRemoteSend (Task chain [{teamRunId}]) → deliver {targetRoot:{agent_team, teamRunId}}
        B: RemoteMessageReceiver → team(teamRunId) (restored if needed) → acceptRemoteMessage: inboundEndpoint (delegator; allowsTarget: any member)
           → wake the member (its root delivery's lease; a not-started member starts on input) → acceptFromRemote (Team log)
        A: ← accepted → commitSentToRemote (the delegator's log)

DS-003  B: member send_message_to(delegator) → its Team root.hasAgentExecution(delegator) → endpointFor (delegator; allowsSender: any member)
        → RemoteMessageSend → deliver {targetRoot: delegatedFrom.coordinatingRun}
        A: RemoteMessageReceiver → the coordinating root → acceptRemoteMessage: inboundEndpoint (delegated_team; the sender is in members) → wake → acceptFromRemote
```

## Ownership Map

- **`RemoteEndpoint` kinds** (`remote-endpoint.ts`; G-1). The core replaces the single `pairedAgentRunId` with the kind's `allowsSender` / `allowsTarget` rules, already the decision points, plus `pairedAgentRunIds`, a set for display and wake lookup.
  - `delegated_run` (A, an Agent link): unchanged rules.
  - **`delegated_team` (new, A):** one endpoint per member run ID of a remote Team link. `allowsSender` / `allowsTarget`: the link's delegator only. `ownershipChain()`: `[{teamRunId}]`. `transmission`: `targetRoot {agent_team, teamRunId}`. `closureFence`: the same `fenced_remote` text as for Agents.
  - `delegator` (B): its rules apply to **every local agent the back-link pairs with**: the host on a standalone root, every member on a Team root. `ownershipChain()`: `[]`. `transmission`: `targetRoot = coordinatingRun`.
- **`RemoteRunLinks`** (shared core): built from the kinded `remoteTaskExecutions` and an optional back-link `{pairedAgentRunIds, delegatedFrom}` (the standalone root passes `[hostRunId]`, the Team root its members). It is still membership plus `deliver`, and it gains `teamLinkFor(teamRunId)` for G-3, G-4 and G-6.
- **`RemoteDelegation`:** `planActivation` maps the answer union: an Agent target as today; a Team target `{execution: {teamRunId}, ingressAgentRunId: <member at coordinatorAddress>}`, with `ownedAgentRunIds: []` (nothing hosted here). `beginActivation` commits the right link kind and sends the work packet with `targetRoot`.
- **`RemoteDelegationReceiver`:** the Agent path is unchanged. A Team source goes to **`RemoteTeamRunStarter`** (new, `remote-collaboration/inbound/remote-team-run-starter.ts`; G-9). It is the one owner of mapping a resolved `TaskTeamExecutionSource` to `TeamRunService.createTeamRun`:
  - the Team-level config from the source's `defaultLaunchConfiguration` (DEC-303);
  - member configs from each member's resolved launch;
  - the workspace and auto-approve as resolved (`defaults_only`);
  - `delegatedFrom` passed through to the tree.

  It returns the team run ID, the coordinator's address and the members from the created root's tree snapshot.
- **`TeamRunService.createTeamRun`** (modified): an optional `delegatedFrom` input, threaded through the plan and config to the tree (`RootTeamRun` exposes it to its remote wiring).
- **The Team root on B (`RootTeamRun`, G-8):**
  - builds its `RemoteRunLinks` with the back-link when its tree has `delegatedFrom`;
  - `acceptRemoteWorkPacket` (new): the link check (the sender is the delegator from that node), then the coordinator's direct input (the existing seed path that starts it), then the system task notification built by `task-execution-input.ts` with the node;
  - `acceptRemoteMessage`: the existing inbound order, with the wake through its member delivery (a not-started member starts on input, P-1).
- **`RemoteTeamIdleShutdown`** (new, `agent-team-execution/services/remote-team-idle-shutdown.ts`; DS-004; G-8): for a Team root with `delegatedFrom`, it arms the grace timer (`AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS`) when every member is idle or offline, cancels it on activity, and on fire stops the root through the manager's normal Stop, which keeps the package (`agent_team_execution.md` § Stop). The next inbound message restores it through `RemoteRootDirectory.team`. It mirrors `StandaloneHostIdleShutdown`.
- **`RemoteMessageReceiver`** (modified, G-2): resolves `targetRoot` by kind for messages and work packets; it no longer guesses "standalone".
- **`agentRunIdsOfTree`** (modified, G-5): adds every member run ID of a remote Team link (A). For a Team tree, it adds `delegatedFrom.delegatorAgentRunId` when present (B). The standalone store's separate back-link parameter moves into the standalone shape too, so there is one rule for every store and validator (SR-017 of slice 1).
- **`RootTaskExecutionLifecycle`** (modified):
  - the existing-copy refusal also asks `RemoteEndpointLookup.isRemoteTeam(teamRunId)` for a `{teamRunId}` copy (G-3);
  - `teamCoordinatorOf(teamRunId)` answers from `RemoteRunLinks.teamLinkFor` (G-6).
- **`RootTaskExecutionResourceScope`** (modified, G-4): for a `{teamRunId}` execution it looks up `teamLinkFor` and fences with the `delegated_team` endpoint.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Scope |
| --- | --- | --- |
| `REMOTE_TEAMS_NOT_SUPPORTED` code, text and the receiver branch | Teams are supported | In This Change |
| The message field `coordinatingRun` and `RemoteMessageReceiver`'s `coordinatingRun`/standalone branch | Replaced by `targetRoot` (G-2) | In This Change |
| `pairedAgentRunId` (single) on the endpoint core | Replaced by the kind rules and `pairedAgentRunIds` (G-1) | In This Change |
| The standalone store's separate `backLinkEndpoint` parameter | Moves into `agentRunIdsOfTree` (G-5) | In This Change |
| Tests asserting the interim Team refusal | Dead | In This Change |

## Interface Boundary Mapping

| Interface | Subject | Identity Shape |
| --- | --- | --- |
| `POST /rest/remote/delegated-runs` answer | Agent or Team created on B | the union above |
| `POST /rest/remote/messages` | One message or a work packet | `targetRoot {kind, runId}` + `target {agentRunId}` |
| `RemoteRunLinks.endpointFor(runId)` / `teamLinkFor(teamRunId)` | Remote endpoints / a remote Team link | Run ID / team run ID |
| `RemoteEndpointLookup.isRemoteEndpoint(agentRunId)` / `isRemoteTeam(teamRunId)` | Lifecycle port | Explicit by subject |
| `RemoteTeamRunStarter.start(source, delegatedFrom)` | B's Team creation | Resolved source |
| `RootTeamRun.acceptRemoteWorkPacket(input)` | B's work packet | `target` = the coordinator |

## Existing Capability Reuse

| Need | Existing | Decision |
| --- | --- | --- |
| Team resolution and launches | `CollaboratorAdmission`, `NodeCatalogPort`, `CollaboratorLaunchResolver` (245) | Reuse |
| Team creation | `TeamRunService.createTeamRun` | Extend (`delegatedFrom`) |
| Member lazy start, restore | Team root lifecycle (P-1, P-4) | Reuse |
| Idle schedule | `StandaloneHostIdleShutdown`, the grace setting | Mirror for Team roots |
| Endpoint set | `agentRunIdsOfTree` | Extend |

## Final File Responsibility Mapping

| File | Change |
| --- | --- |
| `run-history/domain/run-execution-tree-shared-records.ts` | `RemoteTaskTeamExecution`; kinded `RemoteTaskExecution` union |
| `run-history/store/task-execution-tree-split.ts`, `coordinating-tree-shapes.ts`, `run-execution-tree-shared-record-schemas.ts` | Parse and validate Team links; `agentRunIdsOfTree` (G-5) |
| `run-history/store/team-run-execution-tree-schema.ts`, `team-run-execution-tree-store.ts` | `delegatedFrom` read and exact write |
| `agent-collaboration/execution/remote/remote-endpoint.ts` | `delegated_team`; paired sets (G-1) |
| `agent-collaboration/execution/remote/remote-run-links.ts` | Kinded links; back-link pairs; `teamLinkFor` |
| `agent-collaboration/execution/remote/remote-delegation.ts`, `remote-task-activation.ts`, `remote-run-channel.ts`, `remote-refusal-codes.ts` | Answer union, Team target and link, `targetRoot`, code removal |
| `agent-collaboration/execution/task/root-task-execution-lifecycle.ts`, `root-task-execution-resource-scope.ts` | G-3, G-4, G-6 |
| `remote-collaboration/domain/remote-requests.ts`, `channel/peer-client.ts`, `channel/peer-gateway.ts`, `inbound/remote-message-receiver.ts`, `inbound/remote-delegation-receiver.ts`, `domain/remote-refusals.ts` | `targetRoot`, the answer union, the Team branch |
| `remote-collaboration/inbound/remote-team-run-starter.ts` | Add (G-9) |
| `agent-team-execution/services/team-run-service.ts` (+ planner/config plumbing), `domain/root-team-run.ts`, `services/team-run-message-delivery.ts` | `delegatedFrom`; back-link; `acceptRemoteWorkPacket` |
| `agent-team-execution/services/remote-team-idle-shutdown.ts` | Add (DS-004) |
| `standalone-agent-run-root/…` | Back-link pairs `[hostRunId]`; store parameter removal |
| `services/team-communication/team-communication-store.ts`, `run-history/services/team-run-state-package-validator.ts` | Endpoint set through `agentRunIdsOfTree` (no local rule) |
| Docs: `remote_collaboration.md`, `agent_team_execution.md` (peer-started Team runs, idle schedule), `agent_communication.md`, `agent_tools.md` (the Team result with `node`), Nodes tab note text, web localization | Update |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision |
| --- | --- |
| Keep `coordinatingRun` in messages beside `targetRoot` | Rejected: a clean cut (rule 9) |
| Accept Agent-shaped answers without `kind` | Rejected: a clean cut |

## Change / Refactor Sequence

1. **Data model:** kinded links, the Team link type and validation, `delegatedFrom` on the Team tree, `agentRunIdsOfTree`, with key-set and round-trip tests.
2. **Contract:** `targetRoot` in both directions (the Agent path moved first, with its E2E kept green), then the answer union.
3. **Endpoints:** paired sets, `delegated_team`, `teamLinkFor`, G-3/G-4/G-6.
4. **B:** `RemoteTeamRunStarter`, the `TeamRunService` input, the Team root back-link, `acceptRemoteWorkPacket`, `RemoteTeamIdleShutdown`.
5. **A:** `RemoteDelegation` Team planning and commit.
6. Docs; the two-server E2E for AC-301 … AC-306, plus the slice 1/245 suites.

## Key Tradeoffs

- **A stores member IDs** (immutable) versus a lookup on B per message: no extra round trip, and members are wakeable; the cost is a short list.
- **`targetRoot` both ways** versus a Team-only field: one rule for every root kind and direction, and it removes a guess.

## Risks

- RSK-201: every member auto-approves (accepted by the user).
- RSK-301: an unused Team run on B after a failure on A, stopped by the idle schedule (accepted).
- RSK-302: Stop on B through the idle schedule must keep the package and restore cleanly. Covered by P-2/P-4 and the E2E (AC-304).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`. A new Team host path on B (starter, back-link, work packet, idle schedule), kinded links and a new endpoint kind on A, a contract change in both directions, endpoint-set and lifecycle lookups, and changes across `agent-collaboration`, `agent-team-execution`, `run-history`, `remote-collaboration`, the standalone root and docs.
- Architectural risk: `High`. The inter-node contract changes, there are new persisted fields (the Team link, `delegatedFrom` on Team trees), a lifecycle addition (idle stop of peer-started Teams), and every member of a remote Team auto-approves.
- Escalation trigger: a consumer of Team trees or links outside the files named here; or `createTeamRun` cannot carry `delegatedFrom` without a planner change beyond plumbing.

## Guidance For Implementation

- Reproduction to start from: `None` (feature). Start from the two-server harness `tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts`. The premises are proven by the tests listed in `validation-cases.md` § Round 2.
- Move the Agent path to `targetRoot` first and keep its E2E green before adding Teams.
