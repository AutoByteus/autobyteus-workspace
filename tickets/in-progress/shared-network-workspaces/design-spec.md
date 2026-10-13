# Design Spec — Shared Network Workspaces

## Solution And Approval Basis

- Package shared-network-workspaces / project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63; current solution revision SR-015 (approved Nodes NFS Guide scope; core SR-012 behavior retained).
- Approved intent: requirements-doc.md SR-015, approval-record-sr015.md within explicit Nodes guide direction; prior SR-012 service/hosting authority and record retained. No behavior-defining supplements or separate Product-owned UI package; user screenshot is pattern evidence.
- **Design status: Draft — needs completion/alignment with SR-015 guide addition, NOT implementation-ready.** Concrete established boundaries below are design decisions; backend/platform qualification, proportionate trusted-LAN permission policy and runtime exposure remain incomplete and explicitly gated. Do not implement from this draft.
- Canonical investigation: investigation-notes.md in this ticket; executed raw rounds at evidence/feasibility/fr-001–047. Actual physical gate REQ-016/AC-016 remains in force pending the separate async user sequencing answer.
- Authorities read full2026-10-13: solution-designer references/architecture-design.md, design-principles.md, formal design template; root DESIGN.md/TESTING.md, server/web AGENTS.md; server Startup Initialization and Lazy Services, Terminal Service Unification and data_migration_guideline.md. No conflict with these authorities. Design-examples N/A — not yet used to decide a new structure.
- Isolated worktree /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces, branch codex/shared-network-workspaces; base origin/personal@f13bdd0eb79aacc63dffa5995b9c86f359001468, finalization origin/personal. No source modifications/merge/release.

## Current-State Read And Intended Change

Current Docker launcher shares a local host directory only with that host's containers. WorkspaceManager/FileSystemWorkspace/registry store paths and path-hash IDs, not mount/backing identity or readiness. Standalone/Team/Org creation/restore converge on ensureWorkspaceByRootPath but runtime resolvers may fall back to temp/cwd. Terminal has an independent explicit-cwd/home path and directly stats it. Explorer actions use parent fs/promises; watcher child only handles events. Core terminal cwd resolution and Claude SDK spawn use synchronous filesystem inspection/process cwd changes. Those actual paths matter because hard-NFS calls were measured blocking independently of parent heartbeat.

Configured runtime skill materialization writes node-private absolute symlinks into project .claude/.codex skill folders, with process-local last-holder cleanup. FR-009/011 prove stopping one node can break another. NFSv4.1 AllSquash file ownership causes default native Mac Git distrust (FR-028). These are in-scope integration boundaries, not reasons to narrow whole projects to artifacts.

Intended delta: one persistent shared-folder service owns first-use create/connect, qualified source folder, host-client mount, selected local managed Docker integration, verified location output and continued lifecycle. Existing workspace selection/native runtimes access normal mounted files. This is not a new filesystem engine, synchronization agent, public SDK or peer collaboration feature.

## Product Naming — SR-014

User rejects “share the folder” as the product name and suggests filesystem/NFS naming, explicitly offering “autobyteus nfs.” Use **AutoByteus NFS** as the product/service name and **autobyteus-nfs** as the planned command/package name. User-facing Create/Connect choices refer to a shared filesystem. “Source folder” remains the precise underlying storage term, not product branding.

Naming-only refinement within explicit user direction: canonical ticket/package identity shared-network-workspaces, Project Task ID, evidence paths, approved behavior, mount convention and MVP/delivery gates stay unchanged. No source/package/command/release is created by this naming decision; the command is not available yet. This name does not approve an unqualified engine or claim a finished service.

## Rough V1 Service / Packaging Recommendation — SR-013

**Requested recommendation, not a shipped feature or implementation-ready spec.** The user explicitly prioritizes a working first version without excessive security effort and asks whether this should be a separate project, how CI produces it and how the user obtains/runs it. No new experiment, installed command, release endpoint, CI execution or live change is represented.

### Standalone capability, same repository

Choose one separately runnable package at `autobyteus-nfs/` in the current superrepo, not a new GitHub repository or separately managed Project. One product contains the interactive command and persistent service. It should run without opening AutoByteus desktop/server; ordinary apps may use the mounted folder. AutoByteus-specific support is a small opt-in adapter for selected local managed Docker nodes and existing workspace/runtime correctness, not the storage engine itself. A separate repository would add release/integration coordination without solving the demonstrated problem.

The exact implementation language and self-contained packaging technique are still design work; do not create a dependency on a user-installed Node/Python/compiler/toolchain. CI, not the user's computer, builds the package. Native modes remain Docker-independent. Docker server mode is a deployment choice inside the same flow; it is not permission to mount a Mac host or reconfigure an arbitrary existing unprivileged container from inside that container. Host-mediated managed-container integration remains automatic and consented.

### Build once, install and start once

Proposed release path:

`verified source -> CI build/test -> versioned Mac/Linux bundles + slim Linux Docker image -> published download assets -> platform-detecting install-and-start entry -> managed service`

Reuse the repository's GitHub-release/tag conventions (RELEASE.md and existing release-desktop.yml/release-server-docker.yml), rather than invent a release system or independent v1 version stream. Add focused shared-folder build jobs/workflow and declare the new expected assets in the release guide when implemented. Publishing/tagging still requires the release decision and Delivery gates; this conversation does not authorize publishing. GitHub release binary assets and Docker multi-platform images are supported distribution foundations, not proof of this package build.

Build for the selected supported OS/CPU matrix; include/bundle the user-space runtime/backend dependencies where applicable, honor vendor licenses/signing requirements and test clean installation. A target may be advertised only once validated. Docker image is a small service image, not the entire large agent/server prototype image. Primary capability references: https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases ; https://docs.docker.com/build/building/multi-platform/ .

For a fresh computer, the public download page provides **one install-and-start invocation**. That invocation detects platform, downloads a versioned supported bundle, checks its release checksum, installs in an appropriate location, then directly runs the installed entrypoint by absolute path. It must not stop with “now edit PATH/source this file/run another command.” Future PATH integration is idempotent; it cannot change the caller's current shell, so initial configuration must not depend on it. No example URL is published in this draft. `autobyteus-nfs` is a proposed command name only, NOT callable today.

### User journey

1. Run the single install-and-start entry (or installed command on a configured computer).
2. Choose **Create shared filesystem** or **Connect to existing filesystem**.
3. Create: choose existing/new supported source folder, select native/default or Docker deployment if desired, and review the approved trusted-private-network access policy. Connect: paste the displayed server connection information. No NFS/protocol/UID/fstab editing or command assembly.
4. Request only necessary OS/password/privacy approvals and selected Docker-node disruption consent. Configure the supported backend, persistent native mount/reconnect and selected local Docker volumes at the common root where supported.
5. Verify same storage and actual runtime-identity read/write, then print the usable root, server/source mapping and each participating node's result. Example path from experiments: `/Volumes/autobyteus-shared/project`; final source can be any qualified selected source, not an implicit copy.
6. Command exits; OS-managed service/client state continues. Repeating the command shows existing state and safe status/connect/stop actions rather than reinstalling/replacing data. Removing a workspace registration does not stop/delete storage.

Create happens once; each other computer runs its own single connect invocation. Selected supported local Docker agent nodes need no separate in-container commands. Permissions/cancellation/unavailable source or declined node recreation produce truthful incomplete/per-node status, not a ready unrelated folder.

### Storage architecture and MVP security effort

`chosen ordinary source folder -> existing NFS backend -> LAN -> native Mac/Linux mounts + Docker-daemon-managed mounts -> existing workspace selection/native agent tools`

One service UX hides platform-specific backend integration. Native Apple nfsd is the demonstrated Mac-serving route; Linux/Docker candidates are the demonstrated Linux engines. Do not use the failed native UNFS build as a reason to write our own filesystem or promise one unqualified engine everywhere. Existing source/mount identity, native runtime skill/Git/cwd correctness and safe recovery remain necessary working-version work, not optional security polish.

For v1 recommend trusted-private-LAN-only deployment with basic explicit network/participant restrictions, nonroot/squashed data access, private app/runtime state excluded and preserved files/mounts. Do not front-load accounts, PKI/pairing infrastructure, public remote access, tenants or an enterprise security product. A plain NFS/data policy is an explicit **recommendation to explain to the user**, including lack of encryption and coarse trusted-host access; it is not approved here or described as public-network safe. Download integrity and ordinary admin consent are small existing obligations, not a security-platform program. Future hardening is separate scope and does not delay the functional v1 for hypothetical public-service needs.

### Still unfinished

This recommendation answers product/package/distribution shape. It does not complete native mode qualification, minimal exact authorization/export policy, final implementation language/distribution contracts, supported OS/CPU/version matrix, lifecycle/correctness paths or the physical forward gate. The next full design must turn these rough boundaries into a proportionate implementation map. No changed source, CI run, installer, release, user command or new test pass is claimed.

## Nodes NFS Guide Addition — SR-015

The user explicitly asks for another Nodes tab like Docker Guide, giving download/run links and command-copy instructions; their screenshot is retained at evidence/ui-reference/docker-guide-user.png. Approved REQ020/AC020/UC007/BEH007/SCN014 add this informational surface only. It is not a browser-driven mounting wizard, live dashboard, Windows support or Product Team/visualizer request. No new rendered UI exists yet.

Current owners: components/settings/NodeManagerTabs.vue owns tab buttons/ARIA/test identities; NodeManager.vue owns selected-panel union/validTabs/route-query synchronization; DockerNodeStartGuideCard.vue owns its current guide display/copy feedback, with pure command definitions in utils/dockerNodeLauncherCommands.ts. Existing component tests check tab isolation and clipboard output/failure. The NFS guide should use those boundaries, preserve node selection and existing tabs, and not reach a Docker daemon/mount helper/backend merely to show/copy instructions.

Target guide spine DS005: `Nodes -> NFS Guide tab/panel -> supported release/command definitions -> display -> clipboard or download link -> user's terminal -> existing DS001 service setup`. Opening/copying a guide cannot start a service or mutate storage. Actual setup verification still belongs to the standalone service; the guide explains printed root/project selection and automatic selected managedDocker integration. Bootstrap remains one complete install-and-start invocation, unlike making the user copy required install and then mount/configure commands separately.

Candidate in-scope files:
- components/settings/NodeManagerTabs.vue and NodeManager.vue: add nfsGuide alongside dockerGuide, matching accessibility/selection/route behavior; preserve all old tab meanings.
- components/settings/NfsGuideCard.vue (planned): AutoByteus NFS download/first-use/create/connect/workspace guidance, supported platform wording and exact command-copy feedback. Reuse established guide pattern, not a pixel-perfect screenshot clone or a broad command registry.
- utils/nfsLauncherCommands.ts (planned): pure supported release/download/command descriptors, single installed-entry/first-use contract; no fake executable URLs, no live node lookups or command execution. Final syntax depends on service packaging design.
- localization/messages/en/settings.ts and zh-CN/settings.ts: localized tab/content/accessibility/copy/unavailable/error text, existing localization policy.
- corresponding colocated NodeManager/guide/descriptor tests and a current-build user-journey probe: tab/route isolation, display/copy equality, clipboard failure/unavailable release, supported platform labels and preserved navigation. Isolated desktop for full product journey; a UI test alone does not prove installer/filesystem readiness.

UI lifecycle states are selected/unselected, command copied, copy failed and release unavailable. Explain which computer executes a command rather than assuming browser OS/current bound remote node is its execution target. Do not render Windows merely because the reference Docker guide has a PowerShell card. Exact future release links must be validated downstream before advertised as ready. Keep the service independently obtainable outside the app; this tab is a discoverability/onboarding guide, not its lifecycle owner.

Product-owned final visual artifact N/A — explicit separate Product Team support not requested; user-supplied existing pattern and approved requirements govern this narrow addition. No new mockup/visualizer/external designer repository or task is invented. Final geometry should inherit existing accessible/responsive guide components; source implementation/rendered validation remains downstream work.

## Task Size And Architectural Risk

**Not classified yet — completed design required first.** Concrete affected surfaces include new service/platform distribution, privilege/lifecycle/Docker apply, workspace/runtime admission, file/terminal operation ownership and private runtime skill integration. Known security/data-continuity and cross-process impacts rule out assuming Low. Final Small/Medium/Large and Low/High classification/escalation belong to the completed package, not the number of probes. Scope discovered outside the guardrail goes back as follow-up, not implicit expansion.

## Architecture Investigation Evidence

| Source / probe | Observation | Supports / limits |
| --- | --- | --- |
| launcher scripts/public/docker/autobyteus-docker.sh and .d/bash implementation | mkdir local sharing; node recreation may pull/remove/recreate | New service integration must preserve existing image/ports/private mounts, consent before stopping; no blind reuse of launch helper |
| workspace/runtime/terminal/core source paths in investigation | path registration != readiness; fallback and synchronous cwd/filesystem paths | Narrow configured-shared admission, no global startup gate, no main-thread shared stat/chdir assumption |
| FR-026 actual release Mac+twoDocker agents | Four native agent stages with independent bytes/hash | Normal mounted-agent mechanism works; no current-source/product command/physical LAN proof |
| FR-018/029 | Bounded identity/RPC/file child checking on Linux/Mac; timed-out child may remain alive | Retain ownership until observed exit; timeout is not cancellation/READY |
| FR-033 | Reboot sameUUID automount and owned node recreation preserves private state | OS lifecycle components feasible; not normal-user privilege prompt/complete service |
| FR-039 | Native Apple nfsd after explicit apply/restart; APFS source and nativeMac/twoDocker NFS3 ordinary file sharing | Native Mac can serve selected folder; initial Linux clients nolock, no NLM/agent/security parity claim |
| FR-038 | Mac-source Docker bind name_to_handle_at returns95; bytes intact | Do not advertise Ganesha/VFS exports for that Desktop backing |
| FR-040/041/042 | Pinned UNFS3 alternate directly serves Mac bind to ordinary NFS3 clients, no kernel file handles; separate Git assertion/repeat | Promising simpler folder-compatible candidate, not a selected fully qualified backend. No NLM, Native arm64 build/help succeeds but actual native UNFS serving fails FR046/047 bad RPC; no lifecycle/TLS proof |

## Behavior And Production-Path Map

| Behavior | Approved REQ / AC | Trigger and preserved contract | Target path / spine |
| --- | --- | --- | --- |
| BEH-001 operational | 001/002/006/013–019; AC001/012–019 | First service invocation, repeat/login; whole selected folder, simple flow | DS001 service lifecycle and DS002 ordinary mount/data; stable storage identity != path hash |
| BEH-002 user/system | 003/004/012; AC002–004/011 | Select shared workspace, native instructed agent; sandbox/tools/private state preserved | DS003 existing run provisioning/runtime; registered shared path must verify before admission, no temp substitute |
| BEH-003 contract | 002/004/005; AC001/003–005 | Successful fsync/close/fresh open, different-file access; coordinated same-file/Git | DS002 actual OS client -> same source; publication/cache/locking limits mode-specific |
| BEH-004 operational | 007/008/014; AC006/007/014 | Absent/wrong/denied/unavailable/recovery; unrelated local work unaffected | DS004 requested shared-action admission + operation owner; no global startup or kernel deadline claim |
| BEH-005 operational | 009/010/017/019; AC008/009/017/019 | Explicit grant/apply/detach; private state/storage and occupied target preservation | DS001 source/grant/lifecycle ownership; selected node consent and exact retained resources |
| BEH-006 user/system | 011; AC010 | Deliberate reload/reopen; unsaved edits preserved | DS004 current explorer operation owner; remote watcher events not a readiness dependency |
| BEH-007 user/interaction | 020; AC020 | User opens Nodes NFS Guide; copy/download only, existing tabs preserved | DS005 guide discovery -> user terminal -> DS001; no browser-driven mount/service execution |

## Task Design Health Assessment

- Posture: feature/larger requirement with evidence-proven integration defects. Current design issue: Yes in shared execution boundaries.
- Structural triggers: process-local ownership used for cross-node project assets (FR011); readiness policy fragmented across provisioning/restore/terminal; parent synchronous shared filesystem access with measured blocking (FR029 plus traced core/Claude); node recreation lifecycle risks preservation. These are not hypothetical load optimizations.
- Root causes: Missing Invariant and Boundary Or Ownership Issue. Refactor needed now for shared path admission/IO ownership/private runtime exposure; retain unrelated healthy local behavior and existing process release authorities.
- Response: keep mount/storage service outside application DB/runtime homes; one explicit shared-location authority consumed by workspace/file/terminal/run boundaries; use the existing runtime process owners, not a second PID manager. No distributed skill-link registry: configured node-private assets must not be published into shared project directories.
- Unresolved profile/native-name and parent-spawn contracts block final file/API design. Do not conceal them as implementation details already decided.

## Terminology

Source folder: chosen persistent local ordinary files actually served. Mount root: local OS-visible client attachment, preferably /Volumes/autobyteus-shared. Project: subfolder selected as workspace, e.g. /Volumes/autobyteus-shared/project. Storage identity: immutable expected backing identity established during create/connect, separate from workspace root/path hash. Participant: explicitly authorized computer/service identity, not arbitrary remote agent conversation.

## Data-Flow Spines, Narratives And Ownership

| Spine | Scope / start -> end | Governing owner and narrative |
| --- | --- | --- |
| DS001 | Primary: command -> first-use create/connect -> approved configuration -> OS/service lifecycle -> verified folder/status | Shared-folder service owns intended source/connection/grants and persistent lifecycle. Command is thin interactive entry, not a second setup product. OS adapter validates and applies only selected approved changes; operation receipt distinguishes configured from currently usable. Continued work does not require terminal open. |
| DS002 | Primary: native file operation -> local mounted client -> network filesystem service -> chosen source; peer fresh open reverses this path | Existing engine owns filesystem semantics. AutoByteus never proxies individual file reads through a special sharing API or copies/synchronizes project files. Server source and all client roots map to one storage identity. Backend/protocol qualification remains pending. |
| DS003 | Primary: workspace selection -> existing standalone/Team/Org provisioning/restore -> verified shared binding -> runtime opening -> native process cwd -> ordinary tools | Existing provisioning/runtime owners retain sessions, sandbox/auth policies and cancellation. Shared location authority supplies current verified binding or explicit unavailable result. Native configured skills require private exposure; existing process lifetime owners retain/drain exact generations. |
| DS004 | Bounded requested path: file/terminal/run action -> classify configured shared path -> bounded current readiness -> selected action owner -> result/indeterminate | Shared authority does not stat NFS on the parent thread or re-audit every workspace at startup. A file child remains owned after deadline until exit; parent remains responsive. Actual native CLI IO may stall; app cannot promise cancellation of every syscall. |

Return/events: status/path output follows service verification; file/explorer returns follow explicit operation completion. Existing run/runtime streams and watcher streams keep their public boundaries. No cross-node messages, file-to-context ingestion or invented notification owner.

Thin entries: service command and desktop argument dispatch; existing workspace/run/file/terminal API routes. No entry secretly owns storage grants, mount cleanup or process generations. New service app-independent lifecycle means desktop/server shutdown is not authority to delete shared storage.

## Off-Spine Concerns And Boundary Encapsulation

| Concern / authority | Used by | Responsibility / forbidden bypass |
| --- | --- | --- |
| Source qualification/permission grant | DS001 service | Canonical supported folder/private-location/export checks before publish; no hidden copy, recursive chmod/chown or arbitrary root shell execution |
| OS service/mount adapter | DS001 | Exact owned resource/privilege boundary, idempotent config and detach; preserve unrelated exports/mounts. Native mode no Docker prerequisite |
| Docker selected-node apply | DS001 | Snapshot/validate exact local managed node configuration and confirm stop/recreate; preserve immutable image/private volumes/ports; reject remote/unmanaged daemon targets |
| Shared binding/admission | DS003/004 | Expected source/identity and current mount readiness, bounded response; path prefix/hash alone never READY; ordinary local workspace branch is existing supported behavior, not shared fallback |
| Native skill profile | DS003 runtime owner | Node-private assets, same configured logical scope/collision policy; no cross-node cleanup ownership or silent skill disable. Exact native API/name/profile shape still being proved |
| Transport authorization | DS001/002 | Must establish authorized computer/data access and distinguish control credentials from NFS AUTH_SYS. Current raw test allowlists are not a completed supported permission policy; v1 does not automatically require a new PKI/pairing/encryption platform |

Dependency rules: no normal application startup/global registry enumeration waits on network mounts. Existing workspace deletion removes registration only, not service/source. Runtime/file/terminal public owners consult shared authority; callers cannot directly run synchronous shared fs/chdir before it. OS/Docker mutation stays behind service consented lifecycle. A watchdog cannot release a still-alive child slot; already-running native tools retain their normal policy/failure contract.

## Interface Boundary / Naming / Reuse Checks

Proposed subjects have singular natural meaning: source folder, participant grant, shared binding, mount status, selected managed Docker node and runtime skill profile. Do not use generic workspaceId for storage authorization or a generic node selector for computer/container/process. Explicit compound shared binding must carry expected storageId + local mount root + backend endpoint, not redundantly persist a second asserted ready flag. Readiness is an observation, not intended configuration.

Reuse existing workspace registry/manager for path registration; existing workspace input remains rootPath. Reuse native clients/engine for bytes, existing PtySessionManager/IsolatedPtySession and ClaudeSdkProcessOwner/Codex exact leases for lifetime, existing atomic config writer pattern for private intended state. Create a separate service owner because no current owner manages cross-machine storage and OS mount lifecycle. Extend file/terminal requested operation boundaries, not watcher into a second action controller. Detailed method signatures/current SDK profile names are pending proof, not authoritative placeholder APIs.

## Persisted Data / State Transition Decision

- New private service config: new subject, no historical file to migrate. Tolerant known-field projection and exact current writer, no schemaVersion field. Atomic replacement, ordinary recognized intended/actual retry, no speculative per-syscall journal/hash corpus.
- Existing workspace registry: released object mapping workspaceId -> rootPath inspected in workspace-registry-file-persistence.ts110–140. Keep it unchanged. Shared attachment is a separate opt-in binding; absence truthfully means ordinary existing workspace. **Directly usable — no registry migration.** Do not rewrite old paths/IDs, infer every directory named shared was shared, or move projects.
- Existing run/session metadata: no persisted shape change chosen; current skill intent/profile owner must be traced before deciding. **Undetermined for dependent runtime exposure changes**; no migration invented.
- Existing project skill links: prior release creates absolute links without durable cross-node ownership proof; process-local holders do not authorize deleting unknown existing files. Preserve/reject an occupied path where needed; any cleanup needs exact demonstrable ownership and user consent. No global project scan at startup.
- Governing migration convention: full data_migration_guideline.md. Closest inspected remove-global-skill-discovery-mode migration preserves per-file backup on rewrite, SKIPPED when no retired value, FAILED item on read/write error, aggregates partial results; that past mechanism is not selected for this task. Its preserved backups are inert, not authority to replay or reset successful ledger entries. No historical migration source shapes changed/imported yet. Final transition checklist remains required if a runtime format change is selected; no broad startup success gate.

## Legacy Removal / Decommission Plan

| Item | In-scope disposition / replacement |
| --- | --- |
| Shared-path runtime resolution fallback to temp/cwd | Remove only for configured shared binding; explicit admission failure, ordinary local default behavior preserved |
| Node-private configured skill symlinks in shared project | Replace with proven runtime-private exposure; no distributed compatibility link, no blind deletion of user/project-owned assets |
| Parent synchronous shared stat/realpath/chdir at traced boundaries | Move selected shared-path work to correct existing child/action owner; never retain a legacy shared bypass to get a green test |
| Blind managed-node launch recreation for shared apply | Use exact validated configuration and explicit disruption approval, not pull/replace existing image/private state |
| Existing local-only Docker shared folder | Preserve separate supported local use; do not rename/delete it or claim it is network storage |

Compatibility rejection: no old shared runtime fallback/local mirror, SDK file interception, path-only identity, dual project-skill publisher, version-switch legacy data reader or global safe.directory wildcard. These would violate explicit scope/preservation guarantees. Unchanged local-only functionality is not a compatibility wrapper for replaced shared behavior.

## Subsystem And Candidate Folder / File Responsibilities

**Draft allocation, not final implementation map.** Final file list will follow proven backend/distribution/profile contracts, not invent a new subsystem for every row.

| Area / candidate path | Owner / responsibility | Must not contain |
| --- | --- | --- |
| Dedicated shared-folder service package (exact root pending distribution choice) | CLI boundary, persistent service owner, private config, platform OS/mount adapters, filesystem backend integration | App DB/memory, provider credentials, custom filesystem engine, public multi-tenant SDK |
| Existing scripts/public/docker/.d/bash lifecycle | Extend selected local node apply/preservation boundary | Unapproved stop/recreate/pull, sharing CLI homes/private app data |
| server src/workspaces shared binding capability | Path registration integration/admission, configured-vs-observed identity contract | Global startup mount scan, destructive unmount, remote file transfer |
| server file-explorer and terminal-streaming/API ownership | Bounded selected shared actions, preserve terminal home independence | Watcher-as-action-owner, parent synchronous NFS stat |
| server runtime-management and agent-execution/backends/shared | Runtime-private configured skill profile/cwd/lease integration | Shared node-private links, process-local holder mistaken as distributed lock |
| core tools/terminal selected shared operation boundary | Preserve public absolute cwd semantics while removing parent shared blocking | Broad unrelated shell/Windows redesign |
| desktop packaging/early command dispatch | Reach same service from desktop distribution without separate Node/Docker install | Duplicate service state or renderer-only mount orchestration |

Folder depth: entry/interactive transport, service lifecycle/control, private persistence, platform/engine adapters are distinct responsibilities, not one flat utility file. Existing capability folders remain authoritative. Shared types extracted only where real repeated boundary payloads exist; storage identity != workspaceId, intent != readiness, process release != timeout. Final extraction/data-model/field-key checks pending.

## Change / Refactor Sequence And Guidance

1. Finish candidate qualification: native binaries, chosen Mac/Linux/Docker source folder operations/identity/permissions, no fallback; published locks/rename/restart behavior. Retain failed experiments; physical preimplementation gate remains until explicit sequence change approval.
2. Finish service distribution/minimal trusted-LAN permission policy and durable OS lifecycle design, normal privilege/disruption prompt and container execution limits; prove first-run/repeat/cancel/busy detach and selected-source preservation. No claims from a few internal mount commands.
3. Finish private configured native skill discovery/logical-name/collision/profile-generation/release and synchronous cwd/action ownership proof. Use existing exact runtime owners and no local-only shared compatibility fallback.
4. Complete authoritative file/interface/transition map, Change Scope and final size/risk, then route via configured review/implementation rules. No product implementation from this draft.
5. Implementation Engineer owns source/self-checks; independent reviewers and API/E2E own their gates; Delivery owns current-build/full guided user journey, physical Mac/Linux/Docker, docs/merge/user verification/release/cleanup. Original physical/user proof never replaced by these prototype totals.

## Change Scope, Tradeoffs And Risks

Draft boundary: UC001–007/BEH001–007 in approved scope only. New service integration, existing path/run/file/terminal/native runtime boundaries and necessary private-profile correction are in scope. Leave private databases/memories/CLI homes, public service/SDK, Windows, unrelated runtime/platform refactors and parked collaboration unchanged. Known automatic remote watcher limits documented, not a new notification subsystem. Follow-ups: any out-of-scope OS-specific build/dependency portability, broad runtime ownership redesign or public/HA filesystem service is separate work, not needed here.

Key tradeoffs: kernel clients avoid FUSE/CLI interception; native Mac nfsd available but different protocol/port/lifecycle; Ganesha VFS has stronger demonstrated NFS4.1 semantics but cannot directly export tested Mac bind; UNFS3 offers normal-folder portability/single-user UID presentation with no NLM and still-unqualified lifecycle/native packaging. Native UNFS3/libtirpc1.3.8 actual Mac kernel mount fails bad RPC in FR047 despite successful build; do not select it as a uniform engine. Native Apple nfsd remains the demonstrated Mac-serving route. Backend cannot be picked just to satisfy command aesthetics. Working mounted components are not a finished service.

Known risks/gates: physical topology untested; new engine native binary and failure/security matrix not complete; control authorization alone never secures raw NFS data; reserved-source-port checks do not authenticate participants; exact participant revocation/cache limits must be published; ordinary in-flight IO can block; multi-writer project/Git state requires coordination; busy detach must preserve mount/children/data; unsupported folders/OS privacy approval must fail truthfully. No 100% verification or final command is represented.
