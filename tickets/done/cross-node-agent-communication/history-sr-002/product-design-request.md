# Product Design Request — Cross-Node Agent Collaboration

- Result classification: `Product Design Requested`
- Purpose: `New Request`
- Package identifier: `cross-node-agent-communication`
- Current solution revision: `SR-001` (requirements `Draft`, not approved)
- From: Solution Designer (`/software_engineering_team/solution_designer`)
- Date: 2026-10-01

## User's Requested Outcome (user's own words)

> "Can you send a request to product prototype? I want to brainstorm with the product prototype because it's much easier to brainstorm with the product prototype itself."

The user wants to explore and shape the cross-node collaboration experience interactively with Product Team before approving requirements. The draft requirements are input for that conversation, not a settled specification. Product Prototyper chooses how to support this.

## Original Problem

AutoByteus supports multiple nodes (embedded desktop server, remote/Docker servers), but nodes are independent. The user generates a video with an agent on the host node; another node has full computer use. Today the user must manually copy the files to that node, start an agent/team there and ask it to publish. The goal is for an agent on one node to hand work and files to an agent on another node, and for the two agents to keep talking.

## Direction Agreed So Far (from conversation)

- **Trusted private network only:** LAN, company network or VPN/overlay (Tailscale, WireGuard, NetBird). Public-internet trust is out of scope. Foundation first; future multi-owner/company direction must not be precluded.
- **Federation model:** each node owns its own runs; servers forward to each other.
- **Agent mental model unchanged:** an agent sends a task/message with attachments of *its own* files. The product copies the files; the receiver only sees local paths plus a mapping to the sender's originals; the sender gets a delivery confirmation. Each agent knows it is talking to another node.
- **Pair → publish → delegate → follow up:** owners pair nodes; owners publish specific agents/teams as remotely startable; an enabled agent starts a published agent on a peer with a task + files; delegator and remote-started run then message each other both ways.

## Experience Areas To Explore

Requirement and scenario IDs refer to `requirements-doc.md`.

1. **Pairing nodes** (SCN-001, SCN-007; REQ-001/002; DEC-001): how two owners pair servers, see peers, rename and remove pairing. Relationship with the existing Nodes screen (Manage Nodes, Phone Setup, Docker Guide) and its existing node list.
2. **Publishing agents/teams** (SCN-002; REQ-003): how an owner marks a definition as remotely startable and sees what is published.
3. **Agent discovery** (SCN-006; REQ-004; DEC-004): what an agent (and the user) sees about peers and their published agents, including unavailable peers.
4. **The handoff as seen on the sending node** (SCN-003, SCN-005; REQ-005/007/011/016; DEC-002): how the delegation and file delivery appear in the sending agent's conversation — in-progress transfer of a large video, success (remote node + run), and failures.
5. **The handoff as seen on the receiving node** (SCN-003, SCN-008; REQ-007/012/013): how a remote-started run appears in run views with its origin, the first message with received files and path mapping, and the owner's ability to watch, message, stop and delete.
6. **Ongoing conversation across nodes** (SCN-004; REQ-009/010/013): follow-ups and replies with attachments, both directions.
7. **Enabling an agent for cross-node use** (DEC-006): where/how a user turns this on for an agent.

## Constraints And Non-Goals

- Out of scope: public-network trust, person-level identity/SSO, incoming-task approval prompts, quotas, offline queueing, teams with members spread over nodes, messaging runs the agent did not start (SCN-009 is a rejection path), central storage, A2A interop, folder attachments.
- Same-node messaging/delegation behavior must stay unchanged.
- Viewing node B's live run from node A's window is a non-goal (the user can open B's node window).

## Open Questions The User May Want To Settle Through Brainstorming

| ID | Question | Current recommendation (not approved) |
| --- | --- | --- |
| DEC-001 | Pairing mechanism | One-time pairing code (like Phone Access) vs URL-only registration |
| DEC-002 | Does a large transfer block the sender? | Block until delivered/admitted; configurable limit (proposed 10 GB) |
| DEC-003 | Standalone "send files to a node" tool | Separate ticket |
| DEC-004 | Discovery | Read-only listing of peers + published agents |
| DEC-005 | Allowed cross-node message targets | Only delegator ↔ runs it started |
| DEC-006 | Who can use it | Any agent explicitly enabled |
| ASM-002 | Two-way reachability between nodes | To confirm |
| ASM-003 | Published agents on B use B's own models/tools/accounts/workspace | To confirm |

## Existing Product Context

- Frontend: `autobyteus-web` (Nuxt + Electron). Nodes screen: `components/settings/NodeManager.vue`; node registry: `electron/nodeRegistryStore.ts`, `types/node.ts`; remote-access docs: `autobyteus-web/docs/remote_access.md`; inter-agent message rendering via `services/agentStreaming/agentStreamMessageProjector.ts`.
- Pinned source for reference: branch `codex/cross-node-agent-communication` at base `origin/personal` `8caa610ff438c288d9aca9f2efe2c33924fbf517`, worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-agent-communication`.

## Canonical Artifacts (absolute paths)

- Requirements (Draft): `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-agent-communication/tickets/in-progress/cross-node-agent-communication/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-agent-communication/tickets/in-progress/cross-node-agent-communication/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-agent-communication/tickets/in-progress/cross-node-agent-communication/solution-revision-record.md`
- This request: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-agent-communication/tickets/in-progress/cross-node-agent-communication/product-design-request.md`

## Approval State And Expected Output

- Requirements are **not approved**; the brainstorming result is evidence for the user's decisions.
- Expected return: Product Team's result package (with the user's decisions/confirmation where applicable) to Solution Designer, which will integrate approved outcomes into the requirements and seek explicit user approval.

## Routing

- Handoff rules applied (2026-10-01): matched rule "Product Design Requested" → `/product_team/product_prototyper`. No other rule matches (no approved package, no completed architecture, no delivery receipt).

## Addendum 1 — 2026-10-01: base updated (same request scope)

- The ticket branch was fast-forwarded at the user's request. **Pinned source is now `origin/personal` `b0b077b02`** (was `8caa610ff`). Same worktree/branch.
- The new base includes the released **`@` collaborators** feature (`cross-scope-agent-mentions`, v1.4.92-beta.5):
  - In any live run (standalone Agent, Team, Org), the user types `@` to bring a shared local Agent or Agent Team into the run.
  - The run hosts one instance at a root-level address (e.g. `/product_team`); it shows Offline until its first message.
  - The focused agent reaches it with `send_message_to`; agent-to-agent messages show "From <Sender>:".
  - Every user-facing run now always has `send_message_to` and `delegate_task`.
  - Docs: `autobyteus-server-ts/docs/modules/agent_run_collaboration.md`, `agent_communication.md` §Collaborators; ticket `tickets/done/cross-scope-agent-mentions/`.
- New open question **DEC-007**: how a remote target enters a run — (a) the user `@`-mentions a published agent on a paired node, making it a remote collaborator; (b) the agent discovers and delegates on its own; (c) both. This is a natural brainstorming topic alongside DEC-004/005/006.
