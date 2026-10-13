# Investigation Notes — Shared Network Workspaces

## Investigation Meta

- Package: `shared-network-workspaces` / Project Task `project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63`.
- Requirements owner/investigator: Solution Designer; date 2026-10-13; current revision SR-002 (proposed requirements baseline remains SR-001).
- Repository mode: Git.
- Isolated workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces`.
- Branch: `codex/shared-network-workspaces`.
- Resolved base: `origin/personal` at `f13bdd0eb79aacc63dffa5995b9c86f359001468`, after successful `git fetch origin --prune` on 2026-10-13.
- Finalization target: `origin/personal`, inferred from tracked default; read current RELEASE.md before finalization.
- Bootstrap: Complete; no blocker. Shared default checkout `personal` at `92de6460030480c33cef6481d2dd46d2fc9a34be` has unrelated modified/untracked artifacts and remains untouched.
- Authorities read in full: solution-designer/SKILL.md; references/requirements-engineering.md; requirements-doc, investigation-notes and solution-revision-record templates; refreshed worktree AGENTS.md, DESIGN.md, TESTING.md, autobyteus-server-ts/AGENTS.md, autobyteus-web/AGENTS.md (2026-10-13).
- Architecture-phase reading gate: Formal architecture phase not entered. Architecture-design.md and design-principles.md read in full on 2026-10-13 for the user-requested feasibility explanation; no approved-basis design authored. No approved requirements/design/implementation exists. Technical feasibility below is evidence, not selected target architecture.
- Status: Requirements discovery sufficient for proposed SR-001; routine user approval hold. No live storage or mounts changed.

## Initial Request And Historical Context

The dispatch from `/project_task_manager` (AgentRun `project_task_manager_a5f6d9d306e54970bafdad895bdf731d`) explicitly authorizes beginning this Project Task after the user's words: “delegate the task to a software engineer team. I want to start to work on this ticket.” It requires user agreement on mount convention and setup experience before committing requirements.

The user wants ordinary whole project workspaces shared across Mac/Linux computers and Docker nodes on a trusted private network. Shared file availability is not automatic agent-context ingestion or inter-node messaging. The separate parked collaboration Task is not resumed. The public-service/SDK conversation is historical future context only.

Historical transcript read in full before work:
`/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63/context/ctx_721eefd2bded__shared-filesystem-conversation-2026-10-01.txt`.
Original source named there: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_428b0b7a73dd4452b824b045780f48f4/solution_designer_bccdd1d8fb6742c0a0144be986f784fc/raw_traces_active.jsonl` (the attached readable excerpt, not a new read of memory state, is the intake authority).

An older worktree was discovered: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-context-filesystem`, branch `codex/shared-context-filesystem`, base `dd62965cbc55abc9b576d3cd95be4ae89ea45e34`. Its untracked `tickets/in-progress/shared-context-filesystem/requirements.md` and `investigation-notes.md` were read. They describe May-21 memory/context and later dynamic external mounts, are unapproved and have no design. They are distinct historical input, not canonical artifacts for this Project Task. Preserve them unchanged; do not inherit hot-mount or shared-memory requirements.

## Product And Domain Understanding

- Node: a server/runtime execution location; its path is interpreted on that computer/container, not on the client UI's machine.
- Shared filesystem: multiple OS-visible clients of the same backing data, not synchronized copies with matching folder names.
- Shared root: agreed mount path, with projects as subfolders. An AutoByteus path-hash workspace ID is not a storage identifier.
- Mount mechanism vs storage engine: FUSE is an OS bridge; it does not itself implement distributed storage/consistency.
- Supported target: normal existing CLI/native file operations within shared project roots. Files elsewhere, runtime homes and private app data remain separate; cwd is not confinement.

## Source Log

All code/document paths below are relative to the isolated workspace and pinned to its base revision unless noted. Consulted commands include `cat`, bounded `sed`, `rg -n` and `rg --files`; no product mutation or validation suite was run.

| Evidence | Source / command | Finding and confidence | Follow-up |
| --- | --- | --- | --- |
| EV-001 | Dispatch dated 2026-10-13 and attached October-1 transcript, user source lines 2/38/56/82 | Native runtime filesystem access, whole projects, common paths and distinct computers are directly request-backed. Historical JuiceFS/FUSE statements are suggestions, not approval. | Settle product choices directly with user |
| EV-002 | `git symbolic-ref --short refs/remotes/origin/HEAD`; `git fetch origin --prune`; `git rev-parse origin/personal`; `git worktree add -b codex/shared-network-workspaces ... origin/personal`; worktree branch/revision/status | Remote default `origin/personal`; fresh isolated branch at f13bdd0eb79aacc63dffa5995b9c86f359001468; only task artifact directory untracked after bootstrap. | Keep git authoring isolated |
| EV-003 | `scripts/public/docker/autobyteus-docker.sh`; `.d/bash/core.sh:1–95`; `.d/bash/docker-runtime.sh:1–10,225–265` | Public launcher is modular. Shared root defaults to host `~/.autobyteus/docker-server/shared-workspace`; `/shared` is appended; container target is fixed `/home/autobyteus/shared`. `ensure_shared_workspace_dirs` creates local directories. Bind mounts are issued at container creation. These inspected paths have no network join/mount verification. | Do not mistake env-root override or directory existence for a network mount |
| EV-004 | `autobyteus-server-ts/docker/README.md:50–88,565–598`; `.d/bash/docker-runtime.sh` | Private data/auth/browser named volumes; node-specific `/home/autobyteus/workspace`; same-host shared folder; apply recreates containers preserving storage. Current container adds SYS_ADMIN and unconfined seccomp already for existing image behavior. Docs note root-owned host files. No new privilege should be justified by assuming containers are unprivileged today. | Actual container/network permissions and safe recreation |
| EV-005 | `src/workspaces/filesystem-workspace.ts`; `workspace-path-utils.ts`; `workspace-manager.ts:35–140`; `workspace-registry-store.ts:1–100,180+`; `src/api/graphql/types/workspace.ts:1–140`; `src/agent-execution/services/agent-run-provisioning-service.ts` | Workspace metadata is absolute-path based; constructor/initialize do not verify mount availability. ID is SHA256-derived from normalized path. Registry lives in local app-data workspaces.json. Shared backing identity is not represented by this ID. Provisioning requires a root and ensures a workspace by it. | Full admission/restore/Team/Org and filesystem action-path investigation after approval |
| EV-006 | Codex `codex-workspace-resolver.ts`, `thread/codex-thread-config.ts`, `thread/codex-thread-manager.ts:180–220`; Claude `claude-workspace-resolver.ts`, `session/claude-session-query-options.ts`, `runtime-management/claude/client/claude-sdk-client.ts:385–415`; ACP `backend/acp-agent-run-backend-factory.ts:100–155` | Codex thread start/resume sends cwd; Claude query options carry cwd; ACP open/create/load uses cwd. Codex/Claude resolvers can catch resolution errors and fall back to temp/process cwd. Merely guarding our read/write tools would miss native CLI IO. This is static production-path evidence, not real runtime validation. | Configured shared roots need a no-silent-fallback contract and runtime/sandbox tests |
| EV-007 | `src/config/app-config.ts:226–230,330–350`; `src/workspaces/workspace-removal-guard.ts`; runtime `backends/shared/workspace-skill-materializer.ts`, `workspace-skill-links.ts:1–160` | Memory is in app data. Workspace removal protects active runs. Runtime skills are published into project runtime skill subfolders as symlinks to local source paths, with process-local registry ownership and cleanup. Different node-private source paths/process registries may conflict in shared project directories. | Preserve private state; investigate skill collision/cleanup portability instead of assuming transparent runtime compatibility |
| EV-008 | `autobyteus-web/components/workspace/config/WorkspaceConfigForm.vue`; `stores/workspaceFileExplorerLiveActions.ts:155–190`; `autobyteus-server-ts/src/file-explorer/watcher/runtime/chokidar-watcher-runtime.ts:1–95`; relevant lifecycle/snapshot sections of web `docs/file_explorer.md` | Existing UI accepts root_path. Explorer snapshots can refresh root/open folders; watchers are separate child lifecycle, native chokidar (no explicit network polling mode in inspected options). awaitWriteFinish is not proof of remote-event detection. Native event reliability for chosen network filesystem is unknown. | Determine supported deliberate reload/content reopening, then test real remote modifications |
| EV-009 | [JuiceFS architecture](https://juicefs.com/docs/community/architecture/); [cache consistency](https://juicefs.com/docs/community/guide/cache/) opened 2026-10-13 | Mounted clients use metadata engine plus object/file storage. Docs describe close-to-open consistency with default one-second kernel metadata caches. Client writeback mode adds unsent-local-data risks. | Actual cache/durability/lock configuration and platform bridge must be tested |
| EV-010 | [JuiceFS installation](https://juicefs.com/docs/community/getting-started/installation/); [macFUSE](https://macfuse.github.io/) opened 2026-10-13 | JuiceFS supplies Mac/Linux clients and documents macFUSE for mounted macOS access. macFUSE now advertises an FSKit backend for supported filesystems on macOS26. That does NOT establish JuiceFS FSKit compatibility or remove its prerequisites automatically. | Verify exact client/backend combination; do not repeat old blanket claims about mandatory reduced security |
| EV-011 | [Docker bind mounts](https://docs.docker.com/engine/storage/bind-mounts/); [Desktop settings](https://docs.docker.com/desktop/settings-and-maintenance/settings/) opened 2026-10-13 | Bind source belongs to daemon host; Desktop uses a VM bridge; missing --mount sources error by default. Propagation is Linux-only and does not work on Desktop. /Volumes is a default Desktop shared root. | Existing underlying directories still need mount checks; network/FUSE bind semantics and remount recovery are unproven |
| EV-012 | [Ubuntu NFS setup](https://ubuntu.com/server/docs/how-to/networking/install-nfs/); [Linux client manual](https://manpages.ubuntu.com/manpages/noble/man5/nfs.5.html); [Apple mount_nfs source manual](https://raw.githubusercontent.com/apple-oss-distributions/NFS/main/mount_nfs/mount_nfs.8); [Apple signed system volume](https://support.apple.com/guide/security/signed-system-volume-security-secd698747c9/web) opened 2026-10-13 | Existing native NFS support is a credible private-network candidate. Mount/cache/security/locking options matter; local-only locks are not cross-client coordination. Numeric identity/root mapping needs review. Mac protected system root makes /agentfs creation a setup decision, not an ordinary mkdir assumption. | Protocol and real targets not selected; source manuals do not prove user's exact build/bridge |
| EV-013 | `uname -sm`; `sw_vers`; `command -v docker juicefs mount_nfs ssh`; `ls -ld /Volumes` | Investigation host Darwin arm64 / macOS26.5.2 (25F84). Docker CLI, mount_nfs and ssh found; juicefs not found in PATH. /Volumes exists and is root-owned. No daemon, remote host, installed FUSE or active mount verification performed. | Need actual Linux/storage/Docker test resources and authorization before changes |
| EV-014 | `scripts/tests/test_public_docker_launcher_shared_workspace.py` header and selected mount/preservation cases | Existing fake-Docker regression coverage proves launcher policy/configuration, not Mac/Linux shared storage or real container semantics. Root TESTING.md requires test-owned containers/data and actual changed builds. | Appropriate lower-layer coverage plus mandatory real topology evidence |

## Relevant Existing Behavior And Supported Product Paths

| BEH | Current trigger and product sequence | Outcome / invariant | Evidence / unknown |
| --- | --- | --- | --- |
| 001 | User launches managed Docker nodes; launcher creates folders and binds them | Local host/container shared file access, not cross-computer storage | EV-003/004; user's running containers not inspected |
| 002 | User selects absolute project root; starts/resumes runtime | Existing native cwd-based tools can operate normally if OS permissions/storage permit | EV-005/006; actual network-runtime run untested |
| 003 | User uses same path on another node | Identical strings alone do not connect storage; no new cross-node contract | EV-001/005/009–012 |
| 004 | Missing/unavailable path at runtime admission | Metadata registration alone gives no readiness guarantee; resolver fallback can occur | EV-005/006; full paths still to trace |
| 005 | User applies/removes Docker/workspace registration | Private node state and existing folders should persist; removal has active-run guard | EV-004/007 |
| 006 | Explorer becomes visible/reconnects; directory snapshots requested | Snapshot refresh independent of native watches | EV-008; remote network events unproven |

## Relevant Codebase And Structural Surface Inventory

Existing owners: workspace metadata/registry and provisioning; runtime working-directory resolution/native tool spawns; file explorer operations/snapshots/watchers; Docker launcher config hash, state and safe recreation; per-node app data; workspace skill links/materializer.

Payload/state: ordinary project sources, .git and artifacts are potentially shared; local workspaces.json, server data, runtime credentials/sessions and mounted client cache are different state subjects. Data size, file counts, backup state and identities are unknown. No migration or project relocation is authorized.

Potential impacts (NOT selected design): opt-in readiness/admission, launcher mount configuration, deployment lifecycle, storage identity and permission policy, remote refresh, runtime skill link ownership/cleanup. These are structural/security/concurrency boundaries needing post-approval investigation. No task-size/risk classification is finalized before a completed design.

## Feasibility Evaluation — Not A Technology Decision

| Candidate | Evidence-backed fit | Operational tradeoff / unknown |
| --- | --- | --- |
| Native NFS to an existing or dedicated private Linux storage host | Ordinary mounts on Mac/Linux; conventional single shared export. Fewer storage-specific client components than adding a distributed metadata/object architecture. | UID/GID and root-running container access; protocol/locking/cache settings; hard/stalled I/O and missing-mount safety; Mac Desktop bridge must be validated. No claim of public-user isolation from trusted-LAN setup. |
| JuiceFS Community mounted clients | Plausible multi-client mounted engine with separate metadata/file storage; preserves ordinary CLI IO. Reusable foundation if distributed/object-backed storage is needed. | More services/credentials/client/backend dependencies; macFUSE/FSKit compatibility not established; writeback/durability and two-part backups matter. No Community-to-public-service security leap. |
| Existing SMB share | Possible alternative if user already owns such infrastructure | Exact POSIX modes/symlinks/locking and Linux/Mac/Docker behavior not researched sufficiently to select or promise in this task. |
| CephFS/custom FUSE/filesystem driver | Historical alternatives, not needed by current confirmed direction | No evidence justifying cluster/custom-engine scope. Do not broaden without need/approval. |

Preliminary inference: for a simple trusted LAN and one storage host, native NFS deserves comparison as the smallest reference deployment; JuiceFS remains a credible candidate, not the selected engine. Existing infrastructure and target resources may change this recommendation. Requirements specify observable filesystem behavior, not these technologies.

## Runtime, Probe, Or Reproduction Findings

No file operations on shared storage, mounts, container mutations, paid inference, test runs or remote administration performed. Read-only local OS/tool existence checks are EV-013. Static code and current external documentation are feasibility evidence only. No claim of working multi-machine behavior, automatic watcher events or implemented safety checks.

## Stakeholder And User Evidence

October-1 native CLI clarification prevents substituting a backend-only read/write API. Whole project/matching-mount clarification prevents silently narrowing to documents/artifacts. October-13 dispatch narrows supported deployment to trusted private Mac/Linux/Docker, leaving future public service and parked collaboration out of scope.

Three user-facing questions sent on 2026-10-13 through request_user_input_async (accepted; no reply yet at SR-001):
1. Same absolute `/Volumes/autobyteus-shared/<project>` convention vs a different common path vs OS-specific host paths.
2. Documented server/client setup + readiness + Docker integration vs an in-app privileged setup wizard.
3. Concurrent different-file work with coordinated same-file/Git operations vs enforced simultaneous-edit support vs single-writer projects.
These choices are not approvals. Recommend the first option for each with reasoning in DEC-001–003. Ask for actual Linux/storage and Docker hosts for later real validation; target-resource availability is an operational prerequisite, not substitute approval.

## Product Design Request Context And Findings

Product Design request: Not stated. No external Product artifacts/specification/visual references exist. Do not invent a Product handoff. DEC-002 establishes the desired product setup experience first; if user requests Product design assistance, persist and route that explicit outcome per skill.

## Supplemental Artifact Inventory

| Artifact | Owner / purpose | Scope/status | Approval applicability |
| --- | --- | --- | --- |
| Attached October-1 transcript (absolute path above) | Delegator; historical user/assistant context | Read, evidence only | No architecture/technology approval |
| May-21 historical requirements/investigation (absolute worktree above) | Earlier designer; prior unapproved exploration | Preserve externally, distinct scope | Not part of this package's approval basis |
| requirements-approval-request.md in canonical ticket | Solution Designer; persisted full context and pending decisions | Routine approval hold, SR-001 | No authority beyond canonical proposed requirements |
| solution-revision-record.md in canonical ticket | Solution Designer; evolution index | SR-001 | Records absence of approval |
| Design/review/implementation/validation/delivery artifacts | Respective downstream owners | N/A — not yet applicable | Not fabricated or treated as passed |

## Assumptions, Unknowns And Risks

- R-001: Common directory name/path hash is not same storage. Admission/readiness must establish actual mount/backing identity; a marker alone copied locally is insufficient evidence.
- R-002: Missing mount exposes its underlying local directory; launcher mkdir behavior and runtime fallbacks can mask it. Test safe admission and OS/container failure behavior without promising interception of arbitrary native IO.
- R-003: Default container root and cross-OS account IDs do not automatically cooperate with NFS permissions. Do not use chmod777/public exports/no_root_squash as a casual workaround.
- R-004: Runtime-configured skill symlinks point to private per-node paths. Shared project skill mutation/cleanup is a real integration concern even when agents edit different source files. Architecture must investigate; do not silently limit all tests to no-skills and claim complete runtime compatibility.
- R-005: Remote native file notifications may not arrive; directory/content refresh must be a supported deliberate action, not merely a callable internal method.
- R-006: Shared .git means branch/index/locks are shared. Portable project source does not mean portable compiled binaries/dependencies or automatic competing-edit merges.
- R-007: Outage semantics differ from absent/unmounted paths and from deliberate remount. Stalled IO, stale open files, cached reads and uncertain writes need distinct evidence; short admission timeout is not a guarantee all OS syscalls end instantly.
- R-008: Mac Docker Desktop network/FUSE-backed bind access is not proved by Docker's generic host-folder documentation. Actual bridge/configuration/mount lifecycle testing required; Linux-only Docker success does not prove every Desktop route.
- R-009: Actual storage host, Linux version, Docker host/version, test directory/data ownership, network reachability, backups, privileged setup authorization and signed-in CLI test capability are unknown. No user resource alteration permitted yet.

## Architecture Investigation Findings

N/A — requirements not approved. Current technical evidence identifies questions, not target module/file architecture. Before architecture work read its full references/architecture-design.md and references/design-principles.md reading gate; revisit current project DESIGN.md and applicable area contracts. Persisted configuration/data changes, if necessary, require mandatory migration-convention investigation rather than assuming a migration/startup gate.

## Requirement Implications And Next Action

SR-001 proposes ordinary whole-project access with a configured common root, one storage identity, bounded readiness, no unrelated local fallback, explicit consistency/concurrency/permissions/failure boundaries and safe setup/cleanup. Current code supports the path-based foundation but does not prove the cross-machine integration or readiness guarantees. Ask user for DEC-001–003 and explicit approval; revise canonical requirements if choices change. Then complete architecture investigation and design, classify actual scope/risk, and route only the completed implementation-ready package through configured rules. A routine approval hold remains in this requirements conversation, not a delegator/downstream handoff.

## SR-002 — Expert Recommendation Requested (2026-10-13)

User asks whether the idea is possible and requests our expert suggestion/architecture, not another decision questionnaire. Explain yes and recommend a Linux NFS storage host with native Mac/Linux mounts and container bind exposure, instead of a custom filesystem or starting with a public JuiceFS platform. This is a non-authoritative feasibility sketch for understanding requirements, not technology approval or completed design. Full explanation: feasibility-recommendation.md.

Current official Ubuntu NFS, Apple mount_nfs, Docker bind-mount and JuiceFS architecture documents were reopened on 2026-10-13. A subsequent open of Ubuntu's noble Linux nfs.5 page returned Internal Error; do not treat that attempt as additional client-cache evidence. Previously retained source links are unchanged. Recommendation derives from confirmed trusted-LAN scope and the relative operating components, not tested cross-machine proof. Exact NFS protocol/configuration, permissions, cache/locking, shared runtime skill paths, failure/recovery and Mac Desktop bridge remain validation/design questions. Native Mac + Linux-hosted Docker is the recommended first reference topology; Mac-hosted Docker, if needed, is an explicit additional bridge-validation gate, not silently guaranteed or excluded.

Supplement inventory addition: feasibility-recommendation.md; owner Solution Designer; purpose expert feasibility explanation; status Proposed; related REQ-001–012/DEC-001–006; evidence only, not a behavior-defining supplement. Requirements baseline and pending approvals are unchanged. No architecture-spec, code, test run, live mount/storage change or handoff.
