# Automated Setup Requirement Refinement — SR-003

## Identity And Status

- Package: shared-network-workspaces / project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63.
- Date / revision: 2026-10-13 / SR-003.
- Outcome: Ongoing requirements refinement (Requirement Gap), not Architecture Design Complete/implementation-ready.
- Requirements: Draft SR-003, NOT Approved. No design-spec, implementation/test work or live mounts/storage/service/container changes.
- Original delegator: /project_task_manager, AgentRun project_task_manager_a5f6d9d306e54970bafdad895bdf731d.

## Latest User Direction

User wants the easiest possible setup for desktop users, including their Mac desktop plus installed Docker node. They want to run a setup command, have it perform setup, and receive the usable path. They explicitly say the product must provide a solution for non-technical users, not a collection of technical commands. This rejects the prior docs-first setup suggestion; it does not ask for a graphical wizard, public hosted service, SDK or agent messaging.

## Original Goal And Preserved Boundaries

One shared underlying filesystem across real Mac/Linux computers and Docker execution, at an agreed common path, with ordinary whole-project/native CLI operations and no per-file copying. Preserve private app/runtime/auth/database/memory state, filesystem semantics, bounded truthful readiness, no unrelated local substitute, explicit permissions, no competing-edit merge promises, safe lifecycle and no live changes without approval. Done requires real cross-machine/native-runtime evidence, usable docs, merged delivery and explicit user verification.

Historical October-1 transcript remains evidence only; parked cross-node collaboration Task remains parked. Older May dynamic-mount draft is not approved scope.

## Proposed Product Experience

Use a product-delivered guided setup entrypoint. Illustrative, NOT an existing command:

    autobyteus shared setup

In one invocation on a supported participating computer:
1. Choose Create shared storage or Connect to existing shared storage, supplying simple connection information when needed.
2. Detect OS, prerequisites and compatible managed local Docker nodes.
3. Explain and obtain required OS/admin/privacy and any node-disruption approvals.
4. Perform the supported service/client/permission/mount/container configuration internally, without users editing exports/fstab or composing Docker/mount commands.
5. Verify actual backing storage and ordinary read/write access, including selected containers, then print a copyable path and truthful per-target status.

Expected result example (not exact approved terminal wording):

    Shared workspace ready
    Folder: /Volumes/autobyteus-shared
    Desktop: ready
    Selected Docker node: ready

The command name/path remain proposals. One command is per computer; a local command cannot silently authorize or configure every other machine. Storage-owner creation runs once; each other computer joins the same service. Joining should not require manually configuring a separate server. Repeated setup/cancellation/restart must be safe; unsupported/missing/denied conditions are explicit, not reported as success. The helper must be available to desktop-only users too, through the supported desktop distribution or one supported bootstrap.

## Suggested Architecture At Requirements Level

    Guided setup helper
        -> selected existing storage service/client
        -> host's ordinary shared filesystem path
        -> desktop runtime access + selected Docker exposure

AutoByteus owns the setup/lifecycle/permission/readiness integration; the selected existing filesystem owns the actual network file operations. This is not a backend-only read/write API or a new custom filesystem. No target modules or service protocols are finalized before approval.

Prior NFS/Linux recommendation explained file sharing but did not deliver the required experience. Re-evaluate NFS/hosting/helper against automated setup, rather than telling users to administer NFS manually or assuming they have a Linux server. Native Mac NFS server is a documented feasibility lead, not evidence of a complete supported configuration. Mac desktop with existing managed Docker is a core explicit journey; Linux-host Docker alone cannot substitute for validating it.

## Evidence, Risks And Missing Decision

Current launcher code has managed-node discovery and preservation/recreation paths; the inspected start_node path pulls images and can force-remove containers, so it cannot be blindly invoked during an unattended setup of active user runs. Need safe target/disruption/image preservation before reuse. Desktop helper availability is not implemented or verified. Apple documents native nfsd configuration/lifecycle and possible privacy approval. No live daemon/container/mount was changed or verified.

Most important next clarification: which computer holds the shared files—user's Mac, or another designated computer/server? Do not force a separately administered Linux host, or promise Mac hosting/protocol support, without establishing that scope/feasibility. DEC-007 records this. DEC-001 path and DEC-003 concurrency still need settlement; DEC-002 automated-command direction is explicit from the user, not complete requirements approval.

## Workspace And Canonical Absolute Artifacts

- Workspace: /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces.
- Branch: codex/shared-network-workspaces; refreshed base origin/personal @ f13bdd0eb79aacc63dffa5995b9c86f359001468; eventual finalization origin/personal, read RELEASE.md first.
- Requirements: /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/requirements-doc.md.
- Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/investigation-notes.md.
- History: /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/solution-revision-record.md.
- Cumulative intake/approval context: /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/requirements-approval-request.md.
- This latest context: /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/setup-revision-context.md.
- Historical SR-002 sketch: /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/feasibility-recommendation.md.
- Historical intake transcript: /Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63/context/ctx_721eefd2bded__shared-filesystem-conversation-2026-10-01.txt.
- Product/UI/UX, design, review, implementation, executable validation and delivery: N/A — not requested or not yet applicable; no completed gate implied.

## Approval And Next Action

Explain this productized one-command flow directly to the user and clarify actual storage-host location. Requirements baseline approval still needed before formal design; user clarification does not authorize touching live storage or interrupting existing nodes. No configured-route lookup/handoff for this ongoing requirements conversation; do not send the delegator an approval request or begin implementation.
