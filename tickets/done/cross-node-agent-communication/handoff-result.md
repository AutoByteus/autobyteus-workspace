# Handoff Result — Cross-Node Parent Task: Requirements Approved, Slice 1 Proposed

- Package: `cross-node-agent-communication`; revision `SR-004`; date 2026-10-19
- From: Solution Designer (`/software_engineering_team/solution_designer`)
- To: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), the delegator of the parent Task
- Result: parent requirements and slice plan **Approved by the user**. Slice 1 is proposed for creation as a part of the parent.

## Original Request

The parent Task (unparked 2026-10-19) asked for four things: investigate on the current code; rewrite the requirements on the collaboration model around the first slice; say which foundations the first slice needs and what can wait; and propose small slices, sent one by one. No code before approval.

## Approval

The user, in the Solution Designer conversation, 2026-10-19:

> "In general, yeah, text one, slice one text only remote delegations S2. Yeah, I think you had a good plan … You had a really good plan. You can … send the suggested ticket to project task manager, then it can create those tickets. And then we start after that, so we start to work on text only, right? But I guess the main thing is that we should discuss about the architecture … the very first ticket is how do we achieve … the communication itself. … we set up the main architecture, main frame."

- The plan was approved as presented. The user did not answer the open decisions one by one, so they stand as recommended:
  - DEC-101: mutual registration by URL with pinned identity, no secret.
  - DEC-102: the owner publishes individual shared Agents with launch settings; auto-approve off by default.
  - DEC-103: no Product brainstorming now.
- The user's added direction: slice 1 starts with an **architecture discussion with the user** about the inter-node communication frame.

## Proposed Part 1 (create now, `part_of` the parent, `depends_on`: none)

**Title:** Cross-node slice 1: remote delegation, text only

**Description:** see `slice-plan.md` § Slice 1 — Proposed Task Text (verbatim Task text). In short:
- **Settings on each node:** a cross-node switch (off by default); peer nodes registered by URL and name, with the identity pinned (each node registers the other; no secret); the published Agents, each with its launch settings.
- **Delegation:** an agent delegates a text task to a published Agent on a peer, gets the remote run ID back, and the peer runs it as an independent run with its own setup.
- **Follow-ups:** by run ID, both ways, also after idle shutdown and restarts.
- **Refusals:** attachments, saved-Task delegation and unrelated targets are refused with clear reasons.
- **Limits:** no credential crosses nodes; trusted private network only.
- **Architecture first:** the Task begins with the architecture design of the communication frame (inter-node contract, remote run link, run-ID routing across the link), discussed with the user before architecture review and implementation.

**Done when:** AC-101 … AC-113 of `requirements-doc.md` pass, including the user's check across the desktop node and a Docker node, in both directions. Full flow (architecture discussion with the user, architecture review, implementation, code review, API/E2E, delivery).

**Recommended assignee:** `/software_engineering_team` (this Solution Designer holds the context).

**Reference files for the part:** `requirements-doc.md`, `slice-plan.md`, `investigation-notes.md`, `solution-revision-record.md` (below).

## Later Parts (listed, not designed)

The user said "then it can create those tickets". If the user wants them recorded now, they can be created as planned parts. Otherwise they are proposed one by one later. Do not dispatch them yet.

| Slice | Title | Done when | Depends on |
| --- | --- | --- | --- |
| S2 | Attachments across nodes | The video example works end to end without a manual copy | S1 |
| S3 | Lifecycle across nodes (Task closure stops the remote run; stop/reactivate from A; remote run shown on both nodes) | A remote run behaves like a local delegated run for every lifecycle control | S1 |
| S4 | Remote Agent Teams | A Team on a peer can be delegated to and talked with like a local Team copy | S1 (S3 recommended first) |
| S5 | Discovery of peers' published agents | An agent finds a peer's published agent without being told its address | S1 |
| S6 | Security for cross-node (pairing secret, peer authentication, permission checks) | No cross-node request is accepted from an unpaired or unauthenticated node | S1 (better after S2–S5) |

Separate Task candidate, not a part (RSK-001): the desktop's remote-node access exposes a node's full backend to anyone who reaches it on a shared VPN. A possible fix is an optional owner-pairing step. Record it when the user wants it.

## Constraints And Context

- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-agent-communication-r2`, branch `codex/cross-node-agent-communication-r2`, base `origin/personal` `69d7d4f3e643f770b172e565c2d88572f42ded65`. Finalization target per slice: `origin/personal`. The ticket documents are untracked in that worktree.
- The stale worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-agent-communication` (branch `codex/cross-node-agent-communication`) is untouched. It can be removed when the user agrees.
- Expected size of slice 1: Large / High risk. It will be classified after its design, then routed to architecture review.
- Open for slice 1 architecture: ASM-101, ASM-102, ASM-104; RSK-104 (idle shutdown of remote-started hosts), RSK-105 (tool-call timeouts).
- Prerequisites: none found.

## Route Record

- `get_handoff_rules` (2026-10-19): three rules (architecture review, direct implementation, delivery receipt gap). None matches, because no architecture package is complete.
- The parent Task directs the team to propose each slice to the delegating Project Task Manager, and the user explicitly asked to send it there. So this result goes by `send_message_to` to `/project_task_manager`.
- Next expected action: the Project Task Manager creates slice 1 as a part and dispatches it with the user's approval. The parent Task stays open until all its parts are done.

## Artifacts (absolute paths)

- `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-agent-communication-r2/tickets/in-progress/cross-node-agent-communication/handoff-result.md` (this file)
- `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-agent-communication-r2/tickets/in-progress/cross-node-agent-communication/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-agent-communication-r2/tickets/in-progress/cross-node-agent-communication/slice-plan.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-agent-communication-r2/tickets/in-progress/cross-node-agent-communication/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-agent-communication-r2/tickets/in-progress/cross-node-agent-communication/solution-revision-record.md`
- History: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-agent-communication-r2/tickets/in-progress/cross-node-agent-communication/history-sr-002/`
- Design spec: N/A — not applicable (slice 1's Task writes it)
