# Expert Feasibility Recommendation — SR-002

## Status, Request And Authority

- Package: shared-network-workspaces / project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63.
- User follow-up, 2026-10-13: “What is your suggestion because you are experts? I want to understand whether it's possible or not. What is the suggestion? What is the architecture?”
- Purpose: Explain feasibility and recommend a deployment shape so the user can understand the proposed requirements. This is **not an approved design-spec or an implementation-ready architecture**.
- Requirements baseline remains proposed SR-001, Ready for Approval; current evidence revision SR-002. User has not approved the setup/path/concurrency choices or a technology. No live storage changes or implementation/test work authorized by this question.
- Authorities consulted: current canonical requirements/evidence/revision/approval-request artifacts; full architecture-design.md and design-principles.md references from /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/.codex/skills/solution-designer/references/. Root task-worktree DESIGN.md was already read in this conversation. Reading explanatory design authorities does not cross the requirements-approval boundary.

## Recommendation

**Yes, the intended behavior is feasible using established filesystem technology. For the current trusted private-network version, recommend a Linux storage host providing NFS, native mounted clients on Mac/Linux, and Docker bind mounts of the already-mounted storage. Do not build a custom filesystem or put AutoByteus in the file-data path.**

NFSv4 is the preferred protocol family to investigate, not an already-selected/validated exact version or option set. Native mount support is documented for Linux and macOS; actual supported OS/client/server/bridge versions still need validation. [Ubuntu NFS](https://ubuntu.com/server/docs/how-to/networking/install-nfs/), [Apple mount_nfs manual](https://raw.githubusercontent.com/apple-oss-distributions/NFS/main/mount_nfs/mount_nfs.8).

The reasoning is simplicity for one trusted network and one storage computer: the OS filesystem clients can handle native CLI operations without a custom driver/FUSE integration or a new metadata/object-storage service stack. This is engineering judgment based on the confirmed current scope, not a claim that NFS is universally preferable or already works on the user's machines.

## Illustrative Deployment Shape

```text
                 Private Linux storage host
                 Project folders + NFS service
                            |
                  same export / same data
                   /                    \
                  /                      \
      Mac native NFS mount       Linux native NFS mount
      AutoByteus + runtimes      AutoByteus + runtimes
      /Volumes/autobyteus-shared  /Volumes/autobyteus-shared
                                          |
                                  Docker bind mount
                                          |
                                 AutoByteus Docker node
                                 /Volumes/autobyteus-shared
```

Paths are the existing recommended convention (DEC-001), not user-approved. The storage host's physical backing directory can differ; the execution clients use the common mounted path. The storage computer in this sketch is the storage provider, not assumed to be another runtime client loopback-mounting its own export.

For a project, every execution location opens `/Volumes/autobyteus-shared/my-project/report.md`. CLI writes go through ordinary OS filesystem calls into its NFS mount, then the common server. Other clients read the same backing file under the agreed close/open/cache contract. Matching path names facilitate references; the common export establishes sharing. There is no separate copy/sync/attachment step.

On Linux Docker hosts, expose the mounted directory into the container at the same absolute path. A Docker bind source belongs to the daemon's host, not the UI/client machine. Mac Docker Desktop uses a VM host-filesystem bridge; passing a network mount through that bridge is a specific validation gate, not a generic guarantee from the bind-mount docs. Prefer the straightforward Linux-host Docker route for the first reference topology, while retaining Mac native-client support. If Mac-hosted Docker is required, validate that route before marking it supported; do not quietly replace it with a local copy. [Docker bind mounts](https://docs.docker.com/engine/storage/bind-mounts/).

## What AutoByteus Would Own

This is an operational responsibility sketch, not a new module/class design:

1. Supported setup documentation and configuration for the chosen mounted shared root/backing identity.
2. Readiness/admission and actionable diagnostics: actual expected mount and usable permissions, not merely an existing directory or path-hash workspace ID; no unrelated temp/local fallback for shared work.
3. Container path exposure and safe lifecycle/recreation, preserving existing private node volumes/data.
4. Workspace selection and runtime integration, including checking node-specific skill links/cleanup for shared-project conflicts.
5. A deliberate explorer reload/reopen path; automatic cross-client native watcher events must not be assumed.

The filesystem supplies network file access. AutoByteus supplies safe, understandable use of it. Existing workspace roots and CLI cwd integration fit this boundary (investigation EV-003–008). Keep integration focused on the mounted-directory contract rather than inventing a generic storage-provider framework or rewriting every runtime's file operations.

## Honest Limits

- Coordinate simultaneous edits of the same file and Git branch/index operations; a filesystem is not a merge engine. Different-file parallel work is the proposed policy, pending approval.
- A single storage host is an availability dependency and needs backups. Disconnection may stall/fail filesystem calls; our admission/diagnostic timeout is not a promise that every native syscall is immediately cancelable. Apple documents blocking behavior/options in its client manual.
- Explicit permissions/identity mapping are necessary across Mac/Linux/container users; do not default to public exports, chmod777 or removing root restrictions as a workaround.
- Source sharing does not make Mac/Linux binaries/dependencies portable. Keep private runtime homes, auth, databases and memory local.
- Native-runtime operations, cross-client locks/cache visibility, missing-mount behavior, outages/recovery and actual Desktop bridge routes need realistic evidence before a supported claim. Current investigation is not that evidence.

## Why Not Select JuiceFS First?

JuiceFS remains a credible option, particularly if object-backed/distributed storage or a broader future hosted product is the actual goal. Its documented mounted-client architecture uses a metadata engine plus object storage; that adds operational components to the present one-network/one-storage-host problem. [JuiceFS architecture](https://juicefs.com/docs/community/architecture/).

Recommend NFS first for this private-network Task, not a full JuiceFS platform/public service. This changes neither the approved scope (there is no approval yet) nor the historical future-service boundary. A future engine can still expose an ordinary mount to runtimes, but changing storage/semantics would require its own design, transition and validation; no seamless hot-swap or public-service isolation is promised.

## Next Decision Boundary And Context Paths

This expert explanation does not interpret the user's request as approval. Continue requirements conversation; obtain explicit settled requirements approval before authoritative architecture investigation/design and routing. Preserve the pending DEC-001–003 questions without making the user select filesystem internals.

- Workspace: /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces, branch codex/shared-network-workspaces.
- Base/finalization: origin/personal @ f13bdd0eb79aacc63dffa5995b9c86f359001468; eventual target origin/personal subject to RELEASE.md and Delivery.
- Canonical proposed requirements: /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/requirements-doc.md.
- Canonical evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/investigation-notes.md.
- History: /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/solution-revision-record.md.
- Full intake/approval hold: /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/requirements-approval-request.md.
- This explanation: /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/feasibility-recommendation.md.
- Design/review/implementation/validation/delivery: N/A — not yet applicable.
- Handoff: None; ongoing explanatory requirements conversation, not Architecture Design Complete or a blocker escalation. Do not route to implementation or the delegator for approval.
