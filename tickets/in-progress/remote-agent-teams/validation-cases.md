# Validation Of The Approach — Remote Agent Teams (autobyteus-247)

- Purpose: check, before the design, that the approved approach works in the current code (the user, 2026-10-21: "write all the cases down and then you can validate yourself").
- Approach under test (SR-002):
  - B creates a top-level Team run with `delegatedFrom` and returns the team run ID, the coordinator run ID and all member run IDs;
  - A stores a Team link with `nodeId`, the coordinator and the members (addresses and run IDs);
  - the delegator and any member message each other by run ID, with waking;
  - 245's rules apply (catalog address, the `defaults_only` launch base, the temp workspace, auto-approve on).
- Base: `origin/personal` `4a05909457` (1.5.8-beta.5). Every finding is `Read` (code and docs), unless marked otherwise.
- Verdicts:
  - **Works**: the existing code already does it;
  - **Works + G-n**: works with design point G-n;
  - **Out of scope**: by the approved scope.

## Cases

| # | Case | Path through the code | Verdict |
| --- | --- | --- | --- |
| C-01 | Delegate to a shared Team on B (happy path) | A: `delegate_task({node})` → `RemoteDelegation.delegationPlacement` → `dispatchTaskCopy` → root adapter `planActivation` → `RemoteDelegation.planActivation` → `startDelegatedRun`. B: `PeerGateway` → `RemoteDelegationReceiver.start` → `catalogDefinitionAt` (Team) → `catalogTaskSourceOf` → **new: create a Team run** from the resolved `TaskTeamExecutionSource`. A: the Task link (`dispatchTaskCopy` already adds `teamCoordinatorAgentRunId` for a `teamRunId` execution) → the commit of the Team link → the work packet → `delegatedCopyOf` gives the team result shape | Works + G-7, G-8, G-9 |
| C-02 | The result shape | `delegatedCopyOf(target)` returns `{kind: "team", teamRunId, teamCoordinatorAgentRunId}` when `target.execution` is `{teamRunId}` and the ingress is the coordinator; the tool serializes it as `target_team_run_id` / `target_team_coordinator_agent_run_id`; `RemoteDelegation.delegate` adds `node` (`remote-delegation.ts:65`) | Works (when `RemoteDelegation.planActivation` builds the Team target, G-7) |
| C-03 | A member with no own default and no Team default | `defaults_only` resolver: a member not covered → `CollaboratorNoDefaultLaunchError(name, "agent_team")` (`collaborator-launch-resolver.ts:231-238`) → the receiver refuses `NO_DEFAULT_RUNTIME` with `targetName` → A's text "…target agent team <name>…" | Works (the receiver must stop refusing Teams first, G-9) |
| C-04 | A Team default that can't run (runtime unavailable, model unavailable, settings invalid) | Resolver: `CollaboratorAddError(name, reason)` → `AGENT_CANNOT_RUN` | Works |
| C-05 | Unknown address, an Org, a built-in, an application-owned Team | `catalogDefinitionAt` → `null` → `AGENT_NOT_FOUND`; `isEligibleTeam` requires `ownershipScope === "shared"`; Orgs are never candidates | Works |
| C-06 | Auto-approve and workspace for every member | Resolver `defaults_only`: every configured candidate takes the base's `autoExecuteTools: true` and the temp workspace; the Team-level launch is the Team default, else the coordinator's (`:268`, DEC-303) | Works |
| C-07 | Only the coordinator starts; the others start when work reaches them | `agent_team_execution.md` § Root And Agent Lifecycle: Team preparation is scope-only for every Team kind; the first input to a member starts only that member | Works |
| C-08 | Member run IDs are known at creation | `flat-team-topology-planner.ts:182` allocates every member's `agentRunId` at plan time (also seen in real trees: `platformAgentRunId: null` until started) | Works |
| C-09 | The work packet reaches the coordinator on B, naming the delegator and node A | `RemoteMessageReceiver.accept` resolves a work packet's root as a **standalone** root by `target.agentRunId`. A Team's coordinator run ID is not a root ID | Works + G-2, G-8 |
| C-10 | Delegator → coordinator follow-up | A: router → root `hasAgentExecution` → `RemoteRunLinks.endpointFor` (built from the remote list) → `RemoteMessageSend`. B: `RemoteMessageReceiver` resolves the root from `target.agentRunId` as a standalone root | Works + G-1, G-2, G-8 |
| C-11 | Delegator → a member that never started | Same as C-10; B's Team root delivers to that member, whose first input starts it (`startForInput`) | Works + G-1, G-2, G-8 |
| C-12 | Any member → delegator on A | B: the member's root (the Team root) `hasAgentExecution(delegator)` → B's endpoint built from `delegatedFrom`; today only the standalone root has a back-link (`standalone-agent-run-root.ts:139`), and an endpoint pairs with one local agent (`pairedAgentRunId`). A: `RemoteMessageReceiver` → `coordinatingRun` → A's root → `acceptRemoteMessage` → link check (the sender must be in the Team link's members) → wake → `acceptFromRemote` | Works + G-1, G-8 |
| C-13 | A message to the remote **team run ID** | Router asks `ActiveCollaborationRootDirectory.findTeamCoordinator` → each root's `teamCoordinatorOf` (`root-task-execution-lifecycle.ts:231`) reads local task Teams only | Works + G-6 |
| C-14 | A run on A that is not the delegator messages a member on B | The endpoint's pair rule (`allowsSender`: the delegator only) → `TARGET_NOT_PERMITTED` | Works |
| C-15 | A run on B outside the remote Team messages the delegator | That run's root has no endpoint for the delegator: it is not a linked run of that root. The local live-only path doesn't find it either → today's "No running agent …" refusal | Works (an unlinked run is FU-001) |
| C-16 | B's Team goes idle; then a follow-up | Today top-level Team runs have no idle shutdown (`agent_team_execution.md`: idle shutdown is for delegated children); standalone remote hosts got `StandaloneHostIdleShutdown` in slice 1 | Works + G-8 |
| C-17 | B restarts; then a follow-up | `RemoteRootDirectory.team(teamRunId)` → `TeamRunService.resolveManagedTeamRun` restores by team run ID; the restored Team must rebuild its delegator endpoint from `delegatedFrom` on its tree | Works + G-2 (the message must name the team run), G-8 |
| C-18 | A restarts; then a reply from a B member | `coordinatingRun` in the message names A's root → restored; the remote list is loaded from the tree by the shared compose (the Team link must be partitioned like Agent links) | Works + G-5 |
| C-19 | A's stored message view and A's package admission with Team messages | Stores compose with `agentRunIdsOfTree` (`task-execution-tree-split.ts:303`), which adds `link.agentRunId` for remote links; validators use the same set (SR-017) | Works + G-5 (add the coordinator and member IDs of Team links) |
| C-20 | B's stored view and package admission with delegator messages | Team stores and validators use `agentRunIdsOfTree(TEAM_RUN_TREE_SHAPE)`; the standalone store passes the delegator separately (`standalone-root-package-store.ts:72-81`); the Team store has no back-link endpoint | Works + G-5 |
| C-21 | Task closure on A fences the remote Team | `RootTaskExecutionResourceScope.releaseTaskExecutions` → the remote fence through the endpoint looked up by **run ID** (`agentRunId`); a Team copy's execution reference is `{teamRunId}` | Works + G-4 |
| C-22 | A saved Task to the remote Team (existing-copy form `{target_team_run_id, task_id}`) | `RootTaskExecutionLifecycle.assignToExistingCopy:185` refuses only `"agentRunId" in input.copy`; a `{teamRunId}` copy passes | Works + G-3 |
| C-23 | Attachments to a member | `prepareRemoteSend` refuses `reference_files` for any remote endpoint (245) | Works |
| C-24 | Messages are logged once on each node | A: the delegator's log (`commitSentToRemote` / `acceptFromRemote`); B: the Team's `team_communication_messages` through the Team root's engine | Works (with G-1/G-8 wiring) |
| C-25 | The delegator is a member of a local Team copy on A (nested) | The topmost coordinating root holds the link (CM-7), as for Agents | Works |
| C-26 | A member on B delegates further on B, or back to A | B's Team run is a normal Team root: local delegation works; its own remote links work (Team roots support remote links since slice 1) | Works |
| C-27 | The owner on B opens, watches, messages or stops the Team | A normal top-level Team run in history; a stopped run is restored by the next inbound message (C-17) | Works |
| C-28 | B's history of the Team run is deleted | `RemoteRootDirectory.team` → `null` → `TARGET_NOT_FOUND` | Works |
| C-29 | A's commit or packet fails after B created the Team | The Team run stays on B without work until the idle schedule shuts it down; it stays in history (DEC-304, RSK-301) | Works + G-8 |
| C-30 | Peer removed, switch off, identity mismatch | `PeerGateway` order (unchanged) | Works |
| C-31 | Local Team copies, remote Agents, and same-node messaging | Untouched paths; the remote Team uses separate kinds and lists | Works (regression suites) |

## Design Points Found (all bounded; none blocks the approach)

| ID | Point | Why (cases) | Direction for the design |
| --- | --- | --- | --- |
| G-1 | Endpoints pair with **one** local agent (`pairedAgentRunId`) | B's Team delegator endpoint pairs with every member; A's Team link yields one endpoint per member run ID (C-10 … C-12) | Pair with a set: `delegator` on B allows any member of its root; A gets a `delegated_team` kind whose endpoints are the members (the coordinator included), all with the delegator-only rule and the Team's Task chain `[{teamRunId}]`. In memory the remote list holds explicitly kinded links (`kind: "agent"` / `"agent_team"`), never told apart by field presence (SR-004) |
| G-2 | Messages name the receiving root only for B → A (`coordinatingRun`); A → B uses the target run ID as a standalone root ID | A Team member's run ID is not a root ID (C-09 … C-11, C-17) | **Symmetric contract:** every message and work packet carries `targetRoot: {kind, runId}`, the root that receives it on the other node (A → B: the remote run's root; B → A: the coordinating run). `RemoteMessageReceiver` resolves `targetRoot` by kind, one rule for both directions. `coordinatingRun` stays in `delegatedFrom` and in the delegated-runs request |
| G-3 | The existing-copy refusal checks Agent copies only | A `{teamRunId}` copy slips through (C-22) | `RemoteEndpointLookup` also answers for a remote team run ID |
| G-4 | The closure fence looks up endpoints by agent run ID | A Team execution is `{teamRunId}` (C-21) | `RemoteRunLinks` looks up a remote Team link by `teamRunId` for the fence |
| G-5 | The message-endpoint set (`agentRunIdsOfTree`) | A: Team links add the coordinator and member IDs; B: a Team tree with `delegatedFrom` adds the delegator (C-19, C-20) | Both inside `agentRunIdsOfTree`, the one owner (SR-017); the standalone store's separate parameter can move into it too, for one shape |
| G-6 | Team-run-ID guidance | `teamCoordinatorOf` doesn't know remote Team links (C-13) | Answer from the remote list too |
| G-7 | The delegated-runs answer is Agent-shaped (`agentRunId`) | A Team returns more (C-01, C-02) | Answer union: `{accepted: true, nodeId, kind: "agent", agentRunId}` / `{accepted: true, nodeId, kind: "agent_team", teamRunId, coordinatorAddress, members: [{address, agentRunId}]}`, the same names as the Team tree and A's link; `RemoteDelegation.planActivation` builds the Team target and link |
| G-8 | B's Team root as a remote host | Back-link, work packet, idle schedule (C-09, C-12, C-16, C-17, C-29) | The Team root reads `delegatedFrom` from its tree, builds the `delegator` endpoint, admits the work packet to the coordinator (`acceptRemoteWorkPacket`), and gets an idle schedule for a peer-started Team: all members quiet for the grace period → stop the root (package kept) |
| G-9 | B's Team-run creation from a resolved Team source | The receiver refuses Teams today; `TeamRunService.createTeamRun` takes launch-form inputs (C-01, C-03) | One owner maps the resolved source to `createTeamRun` (Team-level and member launches as resolved; the temp workspace; auto-approve) and records `delegatedFrom` on the tree (tolerant read, exact write; Team tree schema `team-run-execution-tree-schema.ts:91-103`) |

## Conclusion

The approach works. Every case traces to existing owners or to one of nine bounded design points. G-2 is a small contract cleanup that makes both directions use one rule. No prerequisite was found. The design (next) resolves G-1 … G-9.

## Data Model Refinement (SR-004, 2026-10-21)

- A's remote Team link names the coordinator by **`coordinatorAddress`**, as the Team tree does, instead of a separate `coordinatorAgentRunId`. The coordinator is a member, so its run ID is the member at that address; each fact is stored once. The cases above are unaffected: wherever they need the coordinator's run ID (the result, the Task record, the work packet), it is found in `members`.
- In memory, remote links are explicitly kinded (`agent` / `agent_team`).
