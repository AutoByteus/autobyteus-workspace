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
