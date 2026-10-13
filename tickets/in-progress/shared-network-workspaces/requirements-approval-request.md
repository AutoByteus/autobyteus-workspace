> Current status (SR-008): Approved SR-004 intent unchanged. Actual Codex/Claude core journey now demonstrated locally in four runtime pairs/16 stages, but shared-skill cleanup fails and is causally reproduced; native Mac/LAN/source-build/GUI/setup gates remain incomplete. See evidence/feasibility/real-agent-roundtrip-report.md. Earlier approval holds/untested status below are historical. No implementation-ready design or live user-node/mount changes.

# Requirements Approval Request / Persisted Context

## Status And Identity

- Package: shared-network-workspaces / project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63.
- Current revision / proposed requirements baseline: SR-003, 2026-10-13; automated-setup Requirement Gap replaces unapproved SR-001 documented-setup proposal.
- Outcome: **Routine requirements approval hold**, not Architecture Design Complete, Terminal or implementation-ready.
- Requirements: Draft SR-003 automated-setup refinement; **NOT approved**. No technology selected, no design spec, code changes, live mount changes or validation passes.
- Delegator: /project_task_manager, AgentRun project_task_manager_a5f6d9d306e54970bafdad895bdf731d.

## Request, Goal And Scope

User wants one mounted shared filesystem across Mac, Linux and Docker nodes on a trusted private network. Projects remain ordinary workspaces and agents/CLI runtimes use normal OS file operations. Writes on one node must be accessible and modifiable on another without manual copying. Same mount names alone are insufficient; use one backing filesystem and an agreed path. User authorized this Task's delegation/start on 2026-10-13; that does not approve the unresolved product choices, a technology or live storage modification.

The historical October-1 discussion considered FUSE/JuiceFS and future public service/SDK. It is a technology lead, not architecture approval. An older May-21 unapproved dynamic-mount/shared-context worktree was also found and preserved. This Task does not resume parked cross-node agent collaboration, share private databases/credentials/internal runtime state, create a public service, automatically move projects or deliver automatic agent notifications/context ingestion.

Done requires actual Mac/Linux multi-computer evidence including a Docker node and native runtime file operations; documented and validated semantics/permissions/outage/recovery/setup; merged delivered changes; explicit user verification owned by Delivery. Mocked/single-host observations do not satisfy that gate.

## Proposed Behavior And Decisions

- Whole project source/Git workspace access, not merely documents/artifacts.
- One common absolute root, recommended /Volumes/autobyteus-shared/<project> across hosts/containers (DEC-001 Needs user).
- User-directed automated command setup + readiness/diagnostics + managed local Docker integration: one guided invocation creates/joins, configures/mounts/verifies and prints the path. Required OS and disruption approvals stay explicit; no graphical wizard requested (DEC-002 decided by user direction, not full-baseline approval).
- Concurrent different-file work, coordinated same-file and Git operations; no automatic merge (DEC-003 Needs user).
- Small successfully synced/closed files reopened on other clients within5s on healthy reference network; not instantly updating already-open descriptors or a global performance SLA (DEC-004 proposed designer decision).
- Missing/wrong/unavailable shared storage must not masquerade as local/temp work. Admission/diagnostic outcome within10s; underlying filesystem IO may stall/fail according to documented engine behavior (DEC-005).
- Guaranteed deliberate explorer reload/reopen; no blanket automatic network watcher notification promise (DEC-006).
- Explicit authorized-participant permissions, private-state preservation, safe occupied-target rejection, no destructive cleanup or unapproved live mount/storage operations.

## Questions Presented To User

2026-10-13 request_user_input_async accepted three questions: common path convention; operational versus in-app setup; concurrent-edit policy. No answers received at SR-001. The recommendation and reasoning for each are in requirements-doc.md DEC-001–003. SR-003 now incorporates the explicit automated-command direction, which was neither of the original documented-setup-vs-GUI options. Path and concurrency are still open, as is DEC-007 storage-host location/platform. User choices changing current intended behavior require refinement before approval. Ask directly for explicit approval of the settled intended behavior and exact baseline; the delegator is not an approval authority.

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

Keep approval conversation here with the user. Settle DEC-001/003/007 (DEC-002 automation now directed by user), refine/re-record baseline if needed, and obtain explicit approval of exact intended behavior; then pass architecture reading gate, investigate complete paths and write design-spec.md. Classify task_size/architectural_risk only after design is complete and apply configured routing then.

No get_handoff_rules/send_message_to/delegate_task handoff is made for this routine approval hold: the authoritative skill expressly says it stays in the requirements conversation. This is not a completed solution outcome and is not sent to the delegator as a substitute for direct user approval.

## User Follow-up — SR-002

The user asks for an expert recommendation/feasibility/architecture explanation before deciding. Full persisted response context: /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/feasibility-recommendation.md. Recommend NFS for the current private-network reference architecture, with native Mac/Linux mounts and Docker bind exposure; explain why this is smaller than a JuiceFS infrastructure platform and why native file operations fit. This is an explanatory proposal, not user approval or authoritative design completion. Pending requirement decisions and no-live-modification boundary remain intact. No handoff for this ongoing requirements clarification.

## User Follow-up — SR-003

User rejects a collection of manual filesystem commands and wants one setup command that handles setup, integrates their desktop+installed Docker node and prints a usable path, suitable for non-technical users. This changes intended behavior and the canonical requirements; no approved design exists. Full revised request/context: /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/setup-revision-context.md. Current requirements are Draft SR-003, not Ready/Approved SR-001. DEC-002 is settled as user-directed automated command setup; path/concurrency and actual storage-host scope remain unresolved. No implicit approval for live mounts, exports, service/credential changes, container recreation or active-run interruption.

## Current State — SR-004 (supersedes SR-003 hold rationale)

User reconfirms easy setup/shared folder/no-extra-managed-container steps and ordinary workspace file visibility across their computers; same absolute path is explicitly best-effort, not mandatory; asks for investigation/experiments until a working solution before implementation. Current canonical requirements are Draft SR-004 with core direction confirmed, not complete technical approval. Technology/reference deployment is for the designer to investigate; the actual storage/test computer is an operational input rather than a reason to ask more product-choice questions. Task-owned disposable feasibility probes now start under evidence/feasibility/fr-001; no existing user storage/mount/node changes permitted by implication. No implementation handoff.

Latest full result/context: /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/feasibility-blocker-handoff.md. Local proof/report: same ticket evidence/feasibility/feasibility-report.md.
