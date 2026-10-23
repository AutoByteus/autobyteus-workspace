# Design Spec — remote-runs-in-tree (autobyteus-278)

## Solution And Approval Basis

- Package: `remote-runs-in-tree`; Task autobyteus-278.
- Requirements: [requirements-doc.md](requirements-doc.md), `Approved` at SR-003 by the user. DEC-801 (a) stream through this node's server; DEC-802 (a) conversation only; DEC-803 messages; DEC-804 (a) Stop and Terminate; DEC-807 first version is the normal path.
- Approved UI/UX package (Product-owned, normative): `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/remote-runs-in-tree/ui-ux-spec.md` with VIS-001 … VIS-021, PA-801 … PA-809, DC-801 … DC-811 (design repository `personal` @ `1cc5563`).
- Current solution revision ID: `SR-008` (ARCH-REV-004 AR-404: the unified Retry rule's per-family differences stated). Design status: `Ready`.
- Authorities read: `solution-designer/SKILL.md` (re-read 2026-10-23), `references/architecture-design.md`, `references/design-principles.md`, `references/ticket-scope.md`, the repository's `DESIGN.md` (phase 1 first; rules 7 and 9), `autobyteus-server-ts/docs/design/collaboration_model.md`. All were read in this conversation.
- Conflicts or discrepancies: none.

## Current-State Read

- **Delegating node (A):** a remote link lives in the root's in-memory `remoteTaskExecutions`, never among the composed `taskExecutions` (E-01). The window's tree and the root stream views (`projectAgentCollaborationView`, the Team and Org view projectors) are built from the composed tree, so remote runs never reach the window (E-02).
- **The window's model for a local delegated copy** (standalone shown here; Team and Org follow the same pattern with their own stores):
  - One root stream (`/ws/agent-collaboration/:hostRunId`) sends `ROOT_EXECUTION_VIEW_SNAPSHOT` (tree, statuses, messages) and then `ROOT_EXECUTION_EVENT`s.
  - A copy's live output is the root event `agent_presentation {execution, message}`, projected to the DTO `{kind: "agent_presentation", member_address, agent_run_id, message}`.
  - Selecting a child loads its stored conversation with `agentRunCollaborationMemberProjection(hostRunId, memberAddress, agentRunId)` (Team: `getTeamMemberRunProjection`; Org: `getAgentOrgMemberRunProjection`).
  - Commands (`SEND_MESSAGE`, `INTERRUPT_GENERATION`) go up the same stream with `target_agent_run_id`, and the root executes them with `root.executeAgentCommand(target, …)`.
  - Sources: `agentRunCollaborationStore.ts`, `agent-collaboration-stream-handler.ts`, `agent-collaboration-view-projector.ts`.
- **The presentation messages already carry everything the opened view shows:** segments, tools, statuses, token usage, file changes, artifacts, member input messages (`agent-presentation-message-dtos.ts`). So PA-805 holds: Activity, Team messages and Usage are built from these, and the Browser panel is this window's own.
- **Between nodes:** request/response only, through `PeerGateway.admit` (switch, registration, identity) and `PeerClient.call` (20 s bound). Inbound handlers check links (`RemoteRunLinks`, stored-link check N-303).
- **The running node (B), corrected at SR-005 (AR-401):** the two kinds of peer-started runs keep their output, commands and readiness in different places.
  - **A remote Agent** is a standalone root whose host is a separate AgentRun.
    - Its output is the host's events, streamed on `/ws/agent/:runId`. It is not on the root publisher, which carries the root's children only (`standalone_agent_run_root.md`; `standalone-agent-run-root.ts:375-385`).
    - Collaboration-stream commands to the host are rejected (`AGENT_ROOT_HOST_COMMAND_REJECTED`), and host input goes through `postToHost`.
    - Idle shutdown ends the host while the root stays registered. A restored host is a new AgentRun, announced by the root's `onHostReady` hook.
    - Stop is `StandaloneAgentRunRootManager.stopRoot`.
  - **A remote Team** is a Team root.
    - Its members' output is on the root publisher.
    - It becomes active and inactive through `ActiveCollaborationRootDirectory` (`commit` / `unregister`), and a restore creates a new root instance.
    - Stop is `TeamRunService.terminateTeamRun`.
  - In both cases, the back-link's endpoint already names the paired agents (`pairedAgentRunIds`: the host for an Agent; the members for a Team; `remote-endpoint.ts:81`).

## Task Size And Architectural Risk (Mandatory)

- `task_size`: `Large`. It spans the contract between nodes (three request kinds and one stream), A's three root kinds (views, events, commands, member projections), B's inbound side, the shared stream contracts, and the window's three tree families and run view.
- `architectural_risk`: `High`:
  - a new kind of channel between nodes, a server-to-server stream;
  - a new capability: a peer's user reads and drives a run on this node, limited to runs that peer started;
  - changes to the shared stream contracts;
  - concurrency (the observation lifecycle against the roots' lifecycles).
- Escalation trigger: already at the top classification.

## Intended Change

**One rule: a remote delegated run is a child of its delegator's root, like a local copy, except that its facts come from its node.**
- A's root lists it in its view.
- A's root feeds its live output into the root's own event stream.
- A's root routes commands for it through the link.
- A's member-projection queries fetch its stored conversation from its node.

The window then needs only what the UI spec adds: the node chip, the hidden actions, the panel notes and Retry. B answers through one inbound owner, and only for runs the caller's delegation started.

## Change Scope (Mandatory)

- **Server, A side:**
  - `agent-collaboration/execution/remote/` (`RemoteRunChannel` port extension, the new `RemoteRunObservation`);
  - the three roots' view and event projectors and command routing (standalone, Team, Org);
  - the three member-projection resolvers.
- **Server, B side:**
  - `remote-collaboration/inbound/` (new `RemoteRunViewProvider`);
  - `channel/peer-gateway.ts`, `channel/peer-client.ts`, `domain/remote-requests.ts`;
  - `api/rest/remote.ts` (three routes and one stream route);
  - `ActiveCollaborationRootDirectory` (activation listener, for Team roots);
  - `standalone-agent-run-root/` (the manager's `observePairedAgents` / `executeOwnerCommand`, through the root's presentation adapter, `onHostReady`, `postToHost`, `stopRoot`) and the Team run manager (the same API).
- **Shared:** `autobyteus-collaboration-stream-contracts` (the tree DTOs' remote executions, a summary event).
- **Server, F-005:** `remoteOwnerUserMessage` composes the heading and drops the `remote_owner` metadata.
- **Web:**
  - the three tree families' contexts and rows (`WorkspaceTransientExecutionRow` gains the chip and the unreachable state);
  - the run view (header chip, hidden ⚙/＋, text-only composer, panel notes);
  - the run-settings "Delegated copies" list (local only);
  - strings in English and Chinese.
- **Docs:** `collaboration_model.md` (CM-11/CM-12, § 4), `remote_collaboration.md`, the web docs.
- **Left alone:**
  - the remote run on B and its own window;
  - messaging through the link (CM-11);
  - idle shutdown and restore;
  - persistence (no stored shape changes);
  - files and terminal (FU-001);
  - the mobile shell's rendering (the mobile Task).
- Follow-ups found during design: FU-001 (files and terminal, the user's decision).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Target path | Spine |
| --- | --- | --- |
| REQ-801 rows | A's root view includes remote executions; summaries (title, statuses, reachable) arrive as root events after a fetch from B | DS-001 |
| REQ-802 live view | A's `RemoteRunObservation` holds a stream to B while the root has viewers; B's frames become A's root events | DS-002 |
| REQ-802 stored conversation | A's member-projection resolvers → `RemoteRunChannel.agentProjection` → B | DS-003 |
| REQ-803, DEC-804 commands | The window's stream command → A's root → `RemoteRunLinks` → `RemoteRunChannel.ownerCommand` → B executes on the linked run | DS-004 |
| REQ-804 errors | Any failed peer call becomes a row state (`reachable: false`) or a command ack; Retry repeats the summary fetch | DS-001 |

## Task Design Health Assessment (Mandatory)

- Change posture: a feature crossing existing owners.
- Root cause of the gap: `Boundary Or Ownership Issue` by design until now. A remote link is "linked, not hosted" (CM-7), so no owner represented it in the view. The design gives A's root that ownership (a child it does not host), so nothing new competes with the root.
- Refactor needed now: no broad refactor.
  - `ActiveCollaborationRootDirectory` gains an activation listener (a small, owned addition).
  - The three roots each gain the same thin delegation to one shared owner, `RemoteRunObservation`. The policy (when to observe, how to map frames) lives once, not three times (Principle 13).
- Phase 1 (DEC-807): no reconnect, catch-up or backoff. The observation is opened when the root gets its first viewer, and on Retry. When it ends, the row shows its last state and "Couldn't reach {node}." when a call fails. Each later refinement has one home (`RemoteRunObservation` for reconnecting, the row component for richer offline states).

## Legacy Removal Policy (Mandatory)

Nothing is replaced. There are no compatibility paths: both nodes run the same release (rule 9).

## Persisted Data / State Transition Decision

`Not Affected`. Remote links are already stored (CM-10). Titles, statuses and conversations are read from B when needed, and nothing new is stored on A.

## Data-Flow Spine Inventory

| ID | Scope | Start | End | Owner |
| --- | --- | --- | --- | --- |
| DS-001 | Primary | The window opens a delegator's root stream | Remote rows with node, title, status and reachability | A's root view projector + `RemoteRunObservation` |
| DS-002 | Primary | The remote run produces output on B | The window renders it in the remote child's view, live | B `RemoteRunViewProvider` → A `RemoteRunObservation` → A root events |
| DS-003 | Primary | The user opens a remote child | Its stored conversation is shown | A member-projection resolver → B |
| DS-004 | Primary | The user sends, stops or terminates | B executes it on the linked run | A root command routing → B |
| DS-005 | Bounded local | A root's stream viewers 0→1 / 1→0 | Observation opened / closed per remote link | `RemoteRunObservation` |
| DS-006 | Bounded local | B's run becomes ready or goes idle (host for an Agent, root for a Team) | B's observation follows it | the root kind's manager (`observePairedAgents`), reached through `RemoteRootDirectory` |

## Primary Execution Spine(s)

- DS-001: `Window → root stream connect → A root view (local tree + remote links with node name) → snapshot sent → RemoteRunObservation.refreshSummaries → PeerClient.runSummaries → B gateway → RemoteRunViewProvider (stored title, statuses) → A root event "remote_task_execution_summary" → window row`
- DS-002: `B: the paired agent's presentation (Agent: host events via the root's presentation adapter; Team: root publisher, paired members only) → manager.observePairedAgents → RemoteRunViewProvider stream frame {agentRunId, message} → A RemoteRunObservation (checks the first frame's nodeId; maps agentRunId to the stored link, drops unknown) → A root event "remote_agent_presentation" → projected as the DTO agent_presentation {member_address from the stored link, agent_run_id, message} → window child view`
- DS-003: `Window selects remote child → member-projection query on A → resolver sees a remote child → RemoteRunChannel.agentProjection → B RemoteRunViewProvider → the run's projection (as B's own window gets it) → window`
- DS-004: `Window SEND_MESSAGE / INTERRUPT_GENERATION / TERMINATE on a remote target → A root executeAgentCommand → target is remote → RemoteRunLinks.ownerCommand → PeerClient.ownerCommand → B gateway → RemoteRunViewProvider → RemoteRootDirectory → the root kind's executeOwnerCommand (Agent: postToHost / host interrupt / stopRoot; Team: member post / member interrupt / terminateTeamRun) → ack → window`

## Spine Narratives (Mandatory)

**DS-001: rows.**
- The root view DTOs gain `remote_task_executions` from the root's remote links. Each entry has kind, the node's name, the address, the run IDs, the members, the delegator and `started_at`.
- The snapshot is sent immediately and never waits for B. Its summary fields are absent ("checking"), and the window shows the row with its last summary or none.
- `RemoteRunObservation` then asks each linked node once for `run-summaries`, one request per node for all of that node's runs in this root. Each answer becomes a root event `remote_task_execution_summary {node, run, title?, statuses[{agent_run_id, status}], reachable}`.
- A failed call gives `reachable: false` for that node's runs. The UI shows "Couldn't reach {node}." with Retry.
- Retry is a stream command `REFRESH_REMOTE_TASK_EXECUTIONS`, which repeats the fetch.
- Statuses map as PA-802 says.

**DS-002: live output (SR-005: AR-401, AR-402, AR-403, N-401).**
- While A's root has at least one stream viewer, `RemoteRunObservation` holds one observation stream per remote link to its node. A root's local stream viewer count is the trigger.
- **B's first frame** is `{nodeId}`. A checks it against the pinned peer, as it checks request answers (N-401).
- **Every later frame is `{agentRunId, message}`.** B sends frames, and statuses in summaries, only for the paired agents: the back-link's `pairedAgentRunIds`.
  - So a B-local copy inside the remote run (247 C-26) never reaches A.
  - The frame carries no member address.
- **A maps by `agentRunId`.** A looks the ID up in its stored link: the Agent link's `agentRunId`, or the Team link's `members`, which already hold the mounted addresses (`remote-team-run-starter.ts:87-94`). An unknown ID is dropped with a debug log (AR-402).
- A turns each frame into its root event `remote_agent_presentation {nodeId, agentRunId, memberAddress (from the link), message}`. The root's projector emits it as the existing DTO `agent_presentation`.
- `AGENT_STATUS` messages update the row's status, as for local copies.
- The observation closes when the last viewer leaves.
- **An end A did not initiate** (B closed, or the connection failed): `RemoteRunObservation` runs the Retry summary fetch once, and its result sets the row: titled and statused, `reachable: false`, or offline. So a dead view never looks live. There is no reconnect (AR-403, DEC-807).
- No server consumer on A treats `remote_agent_presentation` as a local agent's event: not task-execution status tracking, idle shutdown, or persistence. Only the DTO projector maps it. A unit test pins this (N-402).

**DS-003: stored conversation.**
- The three member-projection resolvers on A check their root's remote links first.
- For a remote child, they ask B for `agent-projection {targetRoot, agentRunId}`. B answers with the same projection its own window's projection query returns for that agent. The window renders it as it does for a local child.
- A failure returns a GraphQL error, which the UI shows as its "Couldn't reach {node}." notice with Retry.

**DS-004: commands.**
- The root stream commands keep their shape, including the `target_agent_run_id`.
- When the target is a remote agent run, the root's `executeAgentCommand` hands it to `RemoteRunLinks.ownerCommand` instead of a local agent:
  - `post_message {content, message_id, dedupe_key}`: text only (the UI offers no attachments or `@`);
  - `interrupt`;
  - `terminate`, which ends the whole remote run (Agent run, or Team run).
- B checks that this node's delegation started the run (`delegatedFrom.nodeId`). Then:
  - a message is posted to the agent as user input, with metadata naming the peer owner, so its conversation shows the user's message;
  - an interrupt is applied to the agent;
  - terminate stops the root through its manager (keeping history).
- The ack returns through A to the window as `AGENT_COMMAND_ACK`.
- A message wakes an idle remote run, as any input does on B.
- The message is recorded in the remote run's own conversation on B, and A shows it from there. It is not a run-to-run message, so neither node's message log records it (a clarification of REQ-803's "recorded on both nodes": the run that receives it records it).

**DS-004a: the owner mark (SR-006, CRR-003 F-005).**
- **Where the mark lives: in the message content**, composed once by its one owner `remoteOwnerUserMessage` (`agent-collaboration/execution/remote/paired-agent-access.ts:30`). The message the remote run receives is:

  ```text
  From the owner of node "alpha":

  status?
  ```

  `alpha` is B's own name for the calling peer. The heading's wording is owned there, as `buildTaskWorkText` owns the task header (`task-execution-input.ts:43-60`).
- **Why the content, not metadata.** Every runtime stores and replays a user message's content. Metadata on the input is not kept by the stored conversation or its projection (RC-31 `ownerMarks: []`), and no window or agent reads it. A content header is the pattern this product already uses to say who sent an input: the task header, and the inter-agent message headers.
- The unread `remote_owner` metadata is removed (no dead code). `input_origin: "user_message"`, `message_id` and `dedupe_key` stay.

**Consumer table (Principle 11): everything that reads the owner's message**

| Consumer | What it reads | Result |
| --- | --- | --- |
| The remote agent's model input (every runtime) | The content | The agent sees who wrote it and can answer accordingly |
| B's stored conversation (each runtime's memory) and its projection | The content | Kept as written; the mark survives restore |
| B's own window (the run's conversation) | The projection and live stream content | B's owner sees "From the owner of node "alpha": …" |
| A's window (the remote child view) | The `agent-projection` and the observation frames (`MEMBER_INPUT_MESSAGE` / user message content) | The user sees his message with the heading, the same as B shows it |
| A's window: the local echo of the sent message (N-405) | `upsertUserMessageByIdentity` (`autobyteus-web/services/agentStreaming/handlers/userMessageProjection.ts:50-80`) replaces the optimistic echo by `message_id` / `dedupe_key` | The heading version replaces the plain echo only if both IDs travel end to end: window → A → `owner-commands` → B's input metadata → B's `MEMBER_INPUT_MESSAGE` frame → A. They are kept (`remoteOwnerUserMessage` keeps `message_id`, `dedupe_key`). An E2E assertion pins it |
| The run's title (269: the first message) | The first message (`autobyteus-web/utils/runTreeSummary.ts:10-22`; a stored title wins, `stores/runHistoryNavigationPatches.ts:73`) | Unaffected: a peer-started run's first message is the work packet, and its stored title wins (N-406) |
| Message logs on A and B | — | Not a run-to-run message, so not logged (SR-004 clarification) |

**DS-005: observation lifecycle, A.** `RemoteRunObservation` is created per root. Each root's stream handler calls `viewerAttached` and `viewerDetached`. On 0→1 it opens a stream per remote link and fetches summaries; on 1→0 it closes them. A link added while there are viewers (a new delegation) is observed when its delegation commits.

**DS-006: observation lifecycle, B (SR-005, AR-401).**
- One root-owned API per root kind, offered by its manager (the manager outlives a root instance and a host):
  - `observePairedAgents(runId, onPresentation(agentRunId, message)) → Subscription`;
  - `executeOwnerCommand(runId, agentRunId, command)`.
- `RemoteRootDirectory` exposes both to `RemoteRunViewProvider`, which never touches roots directly (N-304).
- **Standalone (a remote Agent).** `StandaloneAgentRunRootManager` subscribes to the host's events through the root's existing presentation adapter (the same messages the host stream sends). It re-attaches whenever the root's `onHostReady` reports a new host, so a host restored after idle shutdown streams again with no reconnect.
  - `post_message` → `postToHost` (user input, metadata naming the peer owner); `interrupt` → the host's interrupt; `terminate` → `stopRoot`.
- **Team.** The Team run manager subscribes to the root publisher's `agent_presentation` events, filtered to the paired members. It follows the root across restore through `ActiveCollaborationRootDirectory`'s new `onActivated` / `onDeactivated` listeners (a restore creates a new root instance).
  - Member `post_message` and `interrupt` go through the root's member commands; `terminate` → `terminateTeamRun`.
- B ends the stream only when A closes it, or when the run is stopped, terminated or deleted.

## Ownership Map

| Node | Owns |
| --- | --- |
| `RemoteRunChannel` (A, port, extended) | `runSummaries(nodeId, runs)`, `agentProjection(nodeId, targetRoot, agentRunId)`, `observeRun(nodeId, targetRoot, onFrame)` → a closable subscription, `ownerCommand(nodeId, targetRoot, agentRunId, command)` |
| `RemoteRunObservation` (A, new, `agent-collaboration/execution/remote/remote-run-observation.ts`) | Viewer counting; opening and closing observation streams per link; summary fetches and Retry; mapping frames and summaries to the root's events. It is shared by the three roots |
| `RemoteRunLinks` (A, extended) | `ownerCommand`: routes a command for a remote child through the channel (the membership check it already owns) |
| Root view and event projectors (A, three, modified) | Include `remote_task_executions`; project `remote_agent_presentation` and `remote_task_execution_summary` to DTOs |
| Member-projection resolvers (A, three, modified) | Remote child → `RemoteRunChannel.agentProjection`, through one shared helper `remoteChildOf(root, agentRunId)` that all three call (N-403) |
| `PeerClient` / `PeerGateway` (modified) | Three request kinds and one stream kind, with the same admission order and identity checks |
| `RemoteRunViewProvider` (B, new, `remote-collaboration/inbound/remote-run-view-provider.ts`) | The link check (the caller's delegation started this run); summaries from the root managers' stored reads; projections through the projection services; owner commands and the observation, through `RemoteRootDirectory` → the managers' root-owned API |
| `observePairedAgents` / `executeOwnerCommand` (B, new on `StandaloneAgentRunRootManager` and the Team run manager, behind `RemoteRootDirectory`) | Each kind's own source of output, commands and readiness (AR-401) |
| `ActiveCollaborationRootDirectory` (modified) | Activation and deactivation notifications (used by the Team kind's observation) |
| Window contexts (three tree families, modified) | Remote children from the view, with node, summary and reachability; statuses; selection and hydration through the existing queries |
| `WorkspaceTransientExecutionRow` and the run view (modified) | The UI spec's chip, unreachable row and Retry, hidden ⚙/＋, text-only composer, panel notes, local-only Delegated copies list |

## Window Retry Rule (SR-007, FU-004; Principle 13, design-examples Case 6)

- **One owner:** `remoteRunsStore.retry(runId)` (`autobyteus-web/stores/remoteRunsStore.ts`) decides what Retry does. The three per-family copies are removed: `retryRemote` in `agentRunCollaborationStore.ts:133`, `retryRemote` in `agentOrgContextsStore.ts`, `retryTeamRemoteRun` in `teamRemoteRunRegistry.ts`.
- **What each family supplies instead of a callback with the rule inside:** at `register`, a small adapter with only its own mechanisms:
  - `refreshOnStream(): boolean`: asks the root's stream for `REFRESH_REMOTE_TASK_EXECUTIONS`; `false` when the stream isn't ready;
  - `selectedAgent(): string | null`: the agent run the family's view has selected;
  - `isLoaded(agentRunId): boolean`: the family's own "this agent's conversation is loaded" (standalone and Org: the child is hydrated; Team: `isTeamMemberProjectionAuthoritative`);
  - `rereadAgent(agentRunId): boolean`: starts the member read (the existing hydration). It returns `false` when nothing starts, including for an already-loaded agent, so a Retry that asks nothing settles at once.
- **The rule, written once (SR-008, AR-404):**

  ```text
  checking ← true
  refreshed ← adapter.refreshOnStream()
  target ← selectedAgent() if it is one of the run's agents
           else the first of the run's agents that is not loaded (isLoaded)
  started ← target ? adapter.rereadAgent(target) : false
  if not (refreshed or started): checking ← false   // Retry always settles
  ```

  The answers (`applySummary`, `markReachable`) settle it as today.
- **Behavior per family, against today (corrected; my SR-007 "unchanged" was a claim taken on trust, design-examples Case 5).** The three copies were not one rule:
  - standalone (`agentRunCollaborationStore.ts:133-138`) and Org (`agentOrgContextsStore.ts:150-155`) fell back to `agents[0]` and only when the refresh failed;
  - Team (`teamRemoteRunRegistry.ts:24-31`) returned right after a successful refresh, and otherwise read the first member that wasn't loaded.

  The unified rule is intended ("no difference" between families). When an agent of the run is selected, it re-reads that agent if it isn't loaded, and nothing else (a loaded selected agent means no re-read). When none is selected, it re-reads the first agent that isn't loaded. This holds whether or not the refresh succeeded; the pseudocode governs (N-407). What changes:
  - **Standalone and Org:** after a successful refresh with no selected agent, the first unloaded agent is read too (before: none). The fallback is the first *unloaded* agent instead of `agents[0]`, which was a no-op when `agents[0]` was already loaded.
  - **Team:** the selected member is preferred, and after a successful refresh an unloaded selected or first member is read too (before: no read).

  The requests are the same kinds as before. REQ-804 is unchanged. Web only; no server or contract change.
- **Tests:**
  - a spec for the shared rule in `remoteRunsStore`: refreshed or not, selected loaded or not, no unloaded agent, nothing started (settles);
  - one per family for its adapter, covering the behavior above, Team included.

## Removal / Decommission Plan (Mandatory)

None. Dead code in touched files is removed as found.

## Dependency Rules

- `agent-collaboration` keeps owning the port; `remote-collaboration` implements it and imports no root internals; it reaches roots through `RemoteRootDirectory` (N-304).
- The window never contacts a peer.
- Forbidden:
  - a root projector calling `PeerClient`;
  - the window choosing a different stream for a remote child;
  - B answering for a run that the caller's delegation did not start.

## Interface Boundary Mapping

Between nodes (all through `PeerGateway`, admission order unchanged, then the link check):

| Route | Body (after the envelope) | Answer |
| --- | --- | --- |
| `POST /rest/remote/run-summaries` | `runs: [{kind, runId}]` | `runs: [{kind, runId, title?, statuses: [{agentRunId, status}]}]` for runs this caller started; others omitted |
| `POST /rest/remote/agent-projection` | `targetRoot {kind, runId}, agentRunId` | `projection` (the run-view projection payload) |
| `POST /rest/remote/owner-commands` | `targetRoot, agentRunId, command: {kind: "post_message", content, messageId, dedupeKey} \| {kind: "interrupt"} \| {kind: "terminate"}` | `{accepted}` or a refusal |
| `GET /rest/remote/run-observations` (WebSocket) | first frame: envelope + `targetRoot` | first frame `{nodeId}`, then frames `{agentRunId, message}` for the paired agents only; close on end |

The window ↔ server (shared contracts, same release): each root view's tree DTO gains `remote_task_executions[]`. Two root events: `remote_task_execution_summary` and the reused `agent_presentation`. One client command: `REFRESH_REMOTE_TASK_EXECUTIONS`.

## Main Domain Subject Naming Check

"remote" names A's side (`RemoteRunObservation`, `remote_task_executions`); "peer" names the transport (`PeerClient`, `PeerGateway`), as since slice 1. "Owner command" is a command from the delegating node's human owner.

## Existing Capability / Subsystem Reuse Check

| Need | Reused |
| --- | --- |
| Live output format and rendering | `agent_presentation` messages and the window's existing child view |
| Stored conversation | B's projection services, A's member-projection queries |
| Commands | The root stream's commands and `executeAgentCommand` |
| Admission and bounds | `PeerGateway`, `PeerClient` (20 s for requests) |
| Link authority | `RemoteRunLinks` (A), `delegatedFrom` with the stored-link check (B) |

## Concrete Examples / Shape Guidance

```text
alpha's sidebar
└ Project Task Manager
  ├ ▣ docker  Marketing Team        ● working     ← remote_task_executions[0] + summary
  │   "Plan the October campaign…"
  │   ├ marketing_content_creator   ● working     ← statuses from summary / AGENT_STATUS frames
  │   └ deep_researcher             ○ idle
  └ code_reviewer                    ○ idle        ← a local copy, unchanged
```

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Rejected because |
| --- | --- |
| Detecting a peer without the new routes | Rule 9: it fails like any call and shows "Couldn't reach {node}." |
| A separate window stream per remote run | Would make remote children a different thing in the window ("no difference"), with duplicated stores |

## Change / Refactor Sequence

1. Contract: `remote-requests.ts` kinds; the shared stream contracts (remote executions, summary event, refresh command).
2. B: the managers' `observePairedAgents` / `executeOwnerCommand` (standalone through the host, Team through the publisher and the directory listener); `RemoteRunViewProvider`; the gateway and routes.
3. A: the port and `PeerClient` calls; `RemoteRunObservation`; `RemoteRunLinks.ownerCommand`; the three roots' projectors, viewer hooks, command routing and member-projection resolvers.
4. Web: the contexts for the three families; the row and run view per the UI spec; strings.
5. Tests:
   - unit tests per owner;
   - extend the two-server E2E: rows with summaries, a live frame arriving, a projection, a message and its answer, interrupt, terminate, a stopped peer;
   - a browser probe against the VIS references;
   - the standalone, Team and Org delegators (PA-808).
6. Docs.

## Risks

- RSK-801: B's observation stream ties a socket to each observed run while A has viewers. That is fine for a few nodes and runs; it is measured in phase 2 if it matters.
- RSK-802: if A's viewer leaves while B is mid-message, the remote output is not lost (B stores it) and appears in the stored projection next time.
- RSK-201, RSK-401: unchanged. The new capability is limited to runs the caller's delegation started.

## Guidance For Implementation

- The UI spec's fidelity boundary is normative. Port its row and run-view details from the UI reference.
- `RemoteRunObservation` is the only place that knows the viewer count and the streams. The roots call it; they do not open streams themselves.
- B's link check uses the stored `delegatedFrom` (via `RemoteRootDirectory.storedLinkCheck`) before touching a root, and the root's own check after.
