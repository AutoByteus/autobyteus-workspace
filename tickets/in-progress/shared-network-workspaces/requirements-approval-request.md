# Requirements Approval Request / Persisted Context

## Status And Identity

- Package: shared-network-workspaces / project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63.
- Current revision: SR-001, 2026-10-13.
- Outcome: **Routine requirements approval hold**, not Architecture Design Complete, Terminal or implementation-ready.
- Requirements: Ready for Approval as a proposal; **NOT approved**. No technology selected, no design spec, code changes, live mount changes or validation passes.
- Delegator: /project_task_manager, AgentRun project_task_manager_a5f6d9d306e54970bafdad895bdf731d.

## Request, Goal And Scope

User wants one mounted shared filesystem across Mac, Linux and Docker nodes on a trusted private network. Projects remain ordinary workspaces and agents/CLI runtimes use normal OS file operations. Writes on one node must be accessible and modifiable on another without manual copying. Same mount names alone are insufficient; use one backing filesystem and an agreed path. User authorized this Task's delegation/start on 2026-10-13; that does not approve the unresolved product choices, a technology or live storage modification.

The historical October-1 discussion considered FUSE/JuiceFS and future public service/SDK. It is a technology lead, not architecture approval. An older May-21 unapproved dynamic-mount/shared-context worktree was also found and preserved. This Task does not resume parked cross-node agent collaboration, share private databases/credentials/internal runtime state, create a public service, automatically move projects or deliver automatic agent notifications/context ingestion.

Done requires actual Mac/Linux multi-computer evidence including a Docker node and native runtime file operations; documented and validated semantics/permissions/outage/recovery/setup; merged delivered changes; explicit user verification owned by Delivery. Mocked/single-host observations do not satisfy that gate.

## Proposed Behavior And Decisions

- Whole project source/Git workspace access, not merely documents/artifacts.
- One common absolute root, recommended /Volumes/autobyteus-shared/<project> across hosts/containers (DEC-001 Needs user).
- Documented storage/client setup + AutoByteus readiness/diagnostics + Docker integration, using existing workspace selection rather than privileged in-app wizard (DEC-002 Needs user).
- Concurrent different-file work, coordinated same-file and Git operations; no automatic merge (DEC-003 Needs user).
- Small successfully synced/closed files reopened on other clients within5s on healthy reference network; not instantly updating already-open descriptors or a global performance SLA (DEC-004 proposed designer decision).
- Missing/wrong/unavailable shared storage must not masquerade as local/temp work. Admission/diagnostic outcome within10s; underlying filesystem IO may stall/fail according to documented engine behavior (DEC-005).
- Guaranteed deliberate explorer reload/reopen; no blanket automatic network watcher notification promise (DEC-006).
- Explicit authorized-participant permissions, private-state preservation, safe occupied-target rejection, no destructive cleanup or unapproved live mount/storage operations.

## Questions Presented To User

2026-10-13 request_user_input_async accepted three questions: common path convention; operational versus in-app setup; concurrent-edit policy. No answers received at SR-001. The recommendation and reasoning for each are in requirements-doc.md DEC-001–003. User choices differing from proposed baseline require requirements revision before approval. Ask directly for explicit approval of the settled intended behavior and exact baseline; the delegator is not an approval authority.

Additional execution prerequisite: identify actual Linux/storage computer and Docker host (Linux and/or Mac Desktop), permitted test resources, runtime availability and approved live setup actions before multi-machine modification/testing. This does not justify bypassing the approval hold.

## Evidence And Limits

The current launcher has a same-host shared bind at /home/autobyteus/shared and creates local directories. Normal workspace selection supplies CLI cwd, but path-hash IDs and metadata registration do not verify shared backing storage/readiness. Some runtime resolution fallbacks are local/temp. Skill symlinks are materialized into projects from local source directories and need portability/ownership investigation. Watcher behavior for remote network mutations and Desktop network mount bridging are unproved.

Current official docs confirm JuiceFS mounted clients/metadata+storage and close-to-open cache contract; installation includes macFUSE on Mac. macFUSE now has FSKit support for supported clients; JuiceFS's compatibility with it remains unverified. Native NFS is another credible simpler private-LAN candidate; permission/protocol/cache/locking/failure/bridge configuration still needs investigation. No engine selected. See investigation-notes.md EV-009–012 for exact sources.

Only read-only code/docs/local OS capability checks performed. Mac26.5.2 arm64, Docker CLI and mount_nfs are present; no JuiceFS binary found in PATH. No remote computer/resource or actual running user container was verified; no test pass or product completion claimed.

## Workspace, Base And Finalization Context

- Git task workspace: /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces.
- Task branch: codex/shared-network-workspaces.
- Fresh base: origin/personal @ f13bdd0eb79aacc63dffa5995b9c86f359001468 (git fetch origin --prune succeeded 2026-10-13).
- Finalization target: origin/personal inferred from tracked default; RELEASE.md must be read before any merge/release/deployment.
- Shared default checkout and historical worktree kept unchanged. No live storage/mount modification authorized.

## Canonical Absolute Artifacts

- /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/requirements-doc.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/investigation-notes.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/solution-revision-record.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/requirements-approval-request.md (this file)
- Historical transcript: /Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63/context/ctx_721eefd2bded__shared-filesystem-conversation-2026-10-01.txt
- Older, distinct historical package: /Users/normy/autobyteus_org/autobyteus-worktrees/shared-context-filesystem/tickets/in-progress/shared-context-filesystem/{requirements.md,investigation-notes.md}.
- Design, architecture review, implementation, code review, API/E2E and delivery: N/A — not yet applicable; no review bypass/pass implied.
- Product design artifacts: N/A — not requested/not applicable.

## Next Action And Routing

Keep approval conversation here with the user. Settle DEC-001–003, refine/re-record baseline if needed, and obtain explicit approval of exact intended behavior; then pass architecture reading gate, investigate complete paths and write design-spec.md. Classify task_size/architectural_risk only after design is complete and apply configured routing then.

No get_handoff_rules/send_message_to/delegate_task handoff is made for this routine approval hold: the authoritative skill expressly says it stays in the requirements conversation. This is not a completed solution outcome and is not sent to the delegator as a substitute for direct user approval.
