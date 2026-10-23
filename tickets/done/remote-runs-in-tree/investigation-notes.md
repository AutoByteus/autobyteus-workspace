# Investigation Notes — remote-runs-in-tree (autobyteus-278)

## Investigation Meta

- Package: `remote-runs-in-tree`; Task **autobyteus-278** (the user's request, 2026-10-23).
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-runs-in-tree`, branch `codex/remote-runs-in-tree`, base `origin/personal` `3b09fbe308` (v1.5.9-beta.1, one Nodes tab). Finalization target: `origin/personal`.
- Authorities read: `solution-designer/SKILL.md` (re-read after its update, 2026-10-23), `references/requirements-engineering.md`, `references/ticket-scope.md`, `references/finding-the-cause.md`. All were read in this conversation.
- How each finding was established: `Read` (a reproduction is not needed: the absence follows from the code by construction, E-01 and E-02).

## Initial Request

The user: when his Project Task Manager delegates to a Team on another node, "the remote node is not shown under yourself, like the agent or task agent or agent team … A good user experience is that you make the user feel there is no difference: when you delegate, I can still see there is a software engineering team under it, I can talk to it, and it's the same."

## Findings

| ID | Finding | Source |
| --- | --- | --- |
| E-01 | On the delegating node, a remote link is a `taskExecutions` entry with `nodeId` on disk. In memory it is loaded into the root's own `remoteTaskExecutions`, never among the composed `taskExecutions`, "so every walker of local copies excludes it by construction". | `run-history/store/remote-task-execution-links.ts`, `task-execution-tree-split.ts` |
| E-02 | The window's run tree is built from the execution trees the history queries return (`rootTeam`, standalone and Org trees with `taskExecutions`). No API or history service reads `remoteTaskExecutions`, so the window never receives remote runs. | `grep remoteTaskExecutions` in `src/api`, `src/run-history/services`: no hits; `autobyteus-web/stores/runHistoryStoreSupport.ts`, `services/teamExecution/*` |
| E-03 | A remote link holds: `kind`, `nodeId`, `address`, the run IDs (Agent: `agentRunId`; Team: `teamRunId`, `coordinatorAddress`, `members[{address, agentRunId}]`), `delegatorAgentRunId`, `startedAt`. It has no title, status or definition name. Those live on the other node. | `run-execution-tree-shared-records.ts:167`; `collaboration_model.md` § 3 |
| E-04 | A run's conversation reaches the window as a projection (GraphQL `getRunProjection`) plus a live stream: `/ws/agent/:runId`, `/ws/agent-team/:teamRunId`, `/ws/agent-org/:orgRunId`, `/ws/agent-collaboration/:runId`. A root's stream projects the events of every agent in that root, including local task copies (`AgentCollaborationStreamHandler` subscribes to the root's barrier). | `api/websocket/agent.ts:39-182`; `agent-collaboration-stream-handler.ts:86-105` |
| E-05 | Between nodes there are only request/response calls (`PeerClient.call`, 20 s bound): delegated-runs, messages, availability, available-agents. Nothing streams between nodes, and there is no request for a run's projection, status or title. | `remote-requests.ts`, `peer-client.ts` |
| E-06 | Messages between the delegator and the remote run are already recorded on both nodes (CM-9). So the delegating node has that exchange, but not the remote run's own conversation (its reasoning, tool calls, its messages with others). | `collaboration_model.md` CM-9 |
| E-07 | A message into a remote run is admitted on its node only from a linked agent run (`RemoteRunLinks`, `TARGET_NOT_PERMITTED`). There is no inbound kind for a human user of the delegating node. | `remote-run-links.ts`; `remote-message-receiver.ts` |
| E-08 | Lifecycle across the link (stop on Task closure, user stop) is slice S3, not built. On the running node, the remote run has idle shutdown and restore (191/247). | `collaboration_model.md` § 4; 247 |
| E-09 | The `/mobile` shell does not render delegated runs (local or remote) today; its components have no delegated-run tree. The Task says a separate mobile Task covers that and uses the same tree. | `autobyteus-web/components/mobile/*`, `pages/mobile.vue` |
| E-10 | Since 267, the page pattern for peers' data is: this node's server asks the peer, and the window never contacts a peer. Unreachable peers are bounded at 20 s and shown per peer. | 267 design |

## Supplemental Artifact Inventory

To come: the Product Team's UI/UX package.

## Notes For Architecture Design

- The tree data: the delegating node's history DTOs gain the remote links, with the node's name.
- Status, title and conversation: from the running node, through new peer requests. The live part needs a channel that pushes events (E-05): a new mechanism between nodes. This is the main architecture item.
