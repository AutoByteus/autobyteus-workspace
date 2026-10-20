# Handoff — Architecture Design Complete: cross-node slice 1 (autobyteus-191)

- Result: `Architecture Design Complete`; `task_size: Large`, `architectural_risk: High` → independent architecture review
- From: Solution Designer (`/software_engineering_team/solution_designer`); date 2026-10-20
- Package: `cross-node-agent-communication`; Task **autobyteus-191** "Cross-node slice 1: remote delegation, text only", a part of parent **autobyteus-25**; requested by `/project_task_manager`
- Revision: SR-011
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-agent-communication-r2`, branch `codex/cross-node-agent-communication-r2`, base `origin/personal` `5de6a698b946a96a1205ee05f2a4987c427b9ca6` (includes autobyteus-197); finalization target `origin/personal`. The ticket documents and the contract draft are committed on the branch (see the commit in this message).
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-agent-communication-r2/tickets/in-progress/cross-node-agent-communication/`

## What to review

An agent on one AutoByteus node delegates a text task to a published Agent on a peer node over a trusted private network. The two runs then message each other by run ID, in both directions.

Main design points (`design-spec.md`):
- **Tool shape (DEC-111, the user):** `delegate_task` gets an optional `node`. `send_message_to` is unchanged; a follow-up copies the returned run ID, and the link routes it.
- **Transport:** a node-to-node channel: `PeerClient` plus `CrossNodeGateway`, with two request kinds (`/rest/cross-node/delegated-runs`, `/rest/cross-node/messages`). The gateway is the single entry point (the S6 security hook). No version negotiation (DESIGN.md rule 9; the user, SR-005).
- **Root integration:** remote endpoints live in the existing collaboration roots through a shared `RootRemoteLinks`, and activation uses `RemoteTaskActivation`. B creates the run without work; A commits the link; then A sends the work packet.
- **On-disk data model** (§ On-Disk Data Model, designed first at the user's direction):
  - **Node A:** the ordinary `taskExecutions` link plus `nodeId`, loaded as its own kind (`RemoteTaskAgentExecution`).
  - **Node B:** the remote run is a standalone run with `delegatedFrom {nodeId, coordinatingRun, delegatorAgentRunId}` (DEC-112, the user).
  - **Both:** Task records and message-log formats unchanged; no migration.
- **Contract:** `autobyteus-server-ts/docs/design/collaboration_model.md` drafted in the branch (vocabulary, CM-10 … CM-12, § 3, § 4, § 5).

## Approval basis

- Requirements `Approved` by the user: SR-004 (2026-10-19), with changes SR-005 (no version check) and SR-007 (`node` on `delegate_task` only).
- The design was discussed with the user (SR-005 … SR-011): the tool shape, links carry the node (SR-009), contract and data model first (SR-008), and `delegatedFrom` (SR-011).
- Decided by the Solution Designer within the design (user informed): no automatic retries; the peer call runs in the root's task queue; standalone delegators first, then Team/Org.

## Risks and open points for review

- RSK-101: a new inbound surface on the trusted network; no authentication by design until S6.
- RSK-103: peer identity is checked, not proven.
- RSK-106: timeout ambiguity.
- RSK-107: whole-root restore on A for a reply.
- RSK-108: every writer of the three trees must keep `nodeId`.
- The design's escalation triggers.

Prerequisites: none. Follow-ups: `follow-ups.md`, FU-001 (done as autobyteus-197).

## Documents (absolute paths)

- `…/tickets/in-progress/cross-node-agent-communication/handoff-architecture-review.md` (this file)
- `…/requirements-doc.md`
- `…/investigation-notes.md`
- `…/solution-revision-record.md`
- `…/design-spec.md`
- `…/slice-plan.md` (approved supplement)
- `…/follow-ups.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-agent-communication-r2/autobyteus-server-ts/docs/design/collaboration_model.md` (contract draft)
- Prior review artifacts: N/A — not applicable (first review)

`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-agent-communication-r2/tickets/in-progress/cross-node-agent-communication`

## Route record

- `get_handoff_rules` (2026-10-20): the rule "Architecture Design Complete with task_size=Large or architectural_risk=High" → `/software_engineering_team/architecture_reviewer`. No other rule matches.
- Milestone also reported to `/project_task_manager`, at its request (milestone reports for autobyteus-191).

## Revision 1 — 2026-10-20 (SR-012), sent while the review may be running

- Commit `e15408025fc49c869c364922845b87c8ca3d7903` (was `9fb04f2ddc`). Documents only; same scope and decisions.
- **Naming (the user):**
  - peer = the other node; remote = what lives on a peer; the feature = remote collaboration; no "cross-node" in names.
  - `RootRemoteLinks` → `RemoteRunLinks`; `CrossNodeChannelPort` → `RemoteRunChannel`; `CrossNodeGateway` → `PeerGateway`.
  - `CrossNodeSettingsService` split into `PeerDirectory`, `PublishedAgentService` and `RemoteCollaborationCapability`.
  - `/rest/cross-node/*` → `/rest/remote/*` (route class `REMOTE_PEER`); `ENABLE_CROSS_NODE` → `ENABLE_REMOTE_COLLABORATION`; `src/cross-node/` → `src/remote-collaboration/`; `<data>/remote-collaboration/`.
  - `coordinatingRoot` unified to `coordinatingRun`. `PeerNode` kept over `RemoteNode`.
  - See design § Main Domain Subject Naming Check; contract § 4 retitled.
- **Premise checks** (investigation notes P-1 … P-5):
  - the route policy admits credential-less network callers (Reproduced: unit, and a real call from a container);
  - a Docker container reaches the host (Reproduced);
  - a standalone host is made ready again after going offline (Reproduced, unit);
  - an existing two-server E2E harness exists (Read).
- Review the latest commit; nothing else changed.

## Round 2 — 2026-10-20 (SR-013), answering ARCH-REV-001

| Finding | Resolution | Where in `design-spec.md` |
| --- | --- | --- |
| AR-001 | On disk one list; in memory the shared compose/split owner puts `nodeId` links into `remoteTaskExecutions`, so the 170 existing checks never see them. A walker-category table covers include / fence / refuse / exclude, with one guard test per root kind | § Remote Links In Memory; data model item 4; principles |
| AR-002 | `RootCommunicationEngine.sendToRemote` / `acceptFromRemote`: checks, message-ID source, log owners (adapter `commitSentToRemote`). `RemoteRunLinks` reaches messages only through them | § Remote Delivery In The Engine; health assessment; ownership; DS-002/DS-003; mapping; step 3 |
| AR-003 | `REMOTE_SAVED_TASK_NOT_SUPPORTED` in each root's `assignToExistingCopy`, before any Task change | AR-001 table row; Interface Boundary Mapping |
| AR-004 | Envelope `{fromNodeId, toNodeId}`; gateway order; both request bodies and both answer shapes (responder `nodeId`); HTTP status rules | § Contract Between Nodes; `PeerClient` and `PeerGateway` ownership |
| N-1 … N-5 | `requestId` dropped; prepared-run path on B (TTL 24 h); mobile credentials refused; A-09 aligned; idempotency claim dropped | Contract; `RemoteDelegationReceiver`; Risks; investigation notes |

The reviewer's `design-review-report.md` and `architecture-review-revision-record.md` are committed unchanged with this round.

## Round 3 — 2026-10-20 (SR-015), answering ARCH-REV-003

| Finding | Resolution | Where in `design-spec.md` |
| --- | --- | --- |
| AR-005 | The root's message delivery governs each node's half: pair rule → `prepareRemoteSend` → `RemoteRunLinks.deliver` → `commitSentToRemote`; inbound link check → wake → `acceptFromRemote`. No callback | § Remote Messaging: Owners And Order; spine inventory; DS-002/DS-003 |
| AR-006 | `RemoteEndpoint` kinds `delegated_run` / `delegator` with their own pair rule, Task chain and kind rules; `RemoteRunLinks` is a core without side branches; remote delegation is its own owner `RemoteDelegation` | § Remote Messaging (endpoint kinds, delegation owner); ownership; mapping |
| AR-007 | An explicit `fenced_remote` closure result, no release, truthful text | § Task Closure Of A Remote Run; walker table |
| N-6, N-7, N-8, N-10, N-11 | Work packet on B; compose shortcut; wake placement; prepared-run metadata; no Task chain on B | the sections above; data model item 7 |

Basis: SR-014 (`a3b0cf1028`) is also included. It changed only the DS-001 order to match `dispatchTaskCopy` (DI-1 from implementation).
