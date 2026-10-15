# Design Spec — AutoByteus NFS / Shared Network Workspaces

## Solution And Approval Basis

- Package `shared-network-workspaces`, Task `project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63`; current revision **SR-023**; status **Ready — Architecture Design Complete (Mac source identity across normal boots; re-review required)**.
- Intended-behavior authority: requirements-doc.md **Approved SR018**, Solution Designer within the user's explicit working-first v1 direction, exact quote in architecture-review-scope-feedback.md and approval/informing record approval-record-sr018.md. DEC015 defers advanced outage hardening; DEC012 hosting, DEC013 trusted-LAN plaintext and DEC014 physical-test sequencing remain unchanged from approval-record-sr017.md. No behavior-defining supplement or external Product-owned specification. SR023 changes no requirements/ACs. Native Mac same-source ordinary restart and replacement refusal stay mandatory; no new user decision is introduced. REQ004/AC003/QR001 retain healthy source-folder writes and <=5s fresh-client visibility; no platform/writer narrowing. SR021 selected-client restart design remains implemented and scoped independently validated by API004. Normal selected-client restart and ordinary stopped-node preservation remain the existing authority; the Docker no-op-stop observability limit is explicit below. The existing approved native Linux reference must work; no kernel/protocol downgrade or platform narrowing. SR019 private current-source links/no-retention policy remains unchanged; approval-record-sr018.md remains applicable.
- Canonical evidence: investigation-notes.md and evidence/design-recovery/sr023/. Incoming **CRR012 / CR007 P1 / API-F005** is the current Design Impact; **API005 Fail57.14% / broader Required** remains. ARCH006 passed SR022, IR008/source d65aeda24fc4b9a534a3941b194dd4a55b88c00c implements it; CRR011 is historical source-only Pass. API005 independently resolves CR006/API-F004 at both Linux storage forms/native+actual managedHTTP scope and retains CR005/API-F003 scoped normal-reboot/control resolution. CR001–004 scopes retained. New personal Mac dependency probe keeps UUID+inode through three ordinary boots despite raw-device reassignment, distinguishes real directory and APFS-volume replacements with copied marker/content, and retains symlink/permission refusal. NOT product/public-command/API/physical qualification. Complete1302 incoming references remain indexed; no specialist/requirements/production edits. D001 deferred, IMP-D001/FUP001 unchanged.
- Authorities read in this conversation2026-10-13 and recovery2026-10-14/15: solution-designer SKILL and requirements-engineering, architecture-design, design-principles, full formal design template; root AGENTS.md/DESIGN.md/TESTING.md (reread for SR021/SR022/SR023); server/web AGENTS.md; server startup/lazy-services, terminal-unification and data_migration_guideline; predecessor remove-global-skill-discovery-mode migration. No project/general principle conflict. Design-examples N/A — no example required as authority.
- Isolated workspace `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces`, branch `codex/shared-network-workspaces`; base `origin/personal@f13bdd0eb79aacc63dffa5995b9c86f359001468`; finalization `origin/personal`. No main-checkout changes, release, live mounts or data mutation authorized by this design.

## Current-State Read And Intended Change

The following paragraph records the original source-design basis; current IR002–008 production implements service/runtime/launcher/guide, corrected Linux packages and server freshness policy. API003 resolves CR003 at public native-Ubuntu setup scope; API004/005 resolve CR005 selected-client completion and API005 resolves CR006 at its stated Linux/native+managedHTTP scope. CR007 now exposes the persisted Mac device-number lifetime mismatch. The pre-change Docker launcher maps a host-local folder, not common cross-computer storage. WorkspaceManager/FileSystemWorkspace create metadata and path-hash IDs; that is not mount readiness. Standalone, Team and Org provisioning/restore converge on workspace management, but native runtime resolvers can fall back to temp/cwd. Explorer actions and separate workspace/static/run-artifact REST readers run parent filesystem calls, whereas watcher isolation covers events only. The latter readers are reached by normal media/HTML/completed-artifact UI, not by explorer acquisition. Core file/terminal path validation and Claude startup perform synchronous filesystem work; hard NFS can stall these callers. Current configured skill publishers create node-private absolute links inside projects; FR009/011 show another node's cleanup breaking an active peer. Their holders own links, NOT source bytes: SkillSourceService/GitHubSkillRepository delete retired managed generations independently; AGY already uses unleased private links. IMP-D001 corrects the contrary SR018 reuse premise. Cross-node private-skill cleanup is a demonstrated normal-use defect and remains in scope. Parent shared IO can stall during outages, but that hardening is now explicitly deferred under DEC015; healthy existing path-based content delivery is retained. Whole projects remain in scope.


SR023 current path: setup.Plan captures raw st_dev+st_ino; Apply persists it in hosted/pending state; automatic launchd -> serial supervisor -> Reconnect -> CheckSource compares the full pair BEFORE Apple Ensure/mount. API005 proves the same APFS volume/directory is rejected after ordinary raw-device reassignment. Replace only the Mac volume component with actual persistent APFS VolumeUUID; keep directory inode, source marker and other guards. Reconcile both hosted and pending binding lifetime in their existing owners. Linux dev+inode and implemented SR021/SR022 behavior remain unchanged; no new retry/supervision mechanism.
Add **one standalone persistent AutoByteus NFS service**, operated through `autobyteus-nfs`, in this superrepo. Its first invocation creates or connects storage, configures selected local Docker agent nodes, verifies and prints a usable path. Native operating-system NFS clients access the same chosen folder; AutoByteus does not proxy/copy individual project writes. Add a narrow Nodes NFS Guide and setup/new-run identity checks and private-runtime integration while preserving ordinary local behavior.

## Task Size And Architectural Risk

- `task_size: Large`. New Go service/install/release package; native Mac/Linux lifecycle/backend adapters; managed Docker preservation; server workspace and multiple runtime boundaries, with narrow terminal Git-environment support; web guide and executable mode/lifecycle tests. This is the completed file/surface scope, not a count of research rounds.
- `architectural_risk: High`. Privileged OS/export/mount changes, existing source and node-private data preservation, cross-node sharing, private runtime-profile lifetime and privileged persistent service ownership. FR011 demonstrates normal-use peer cleanup; FR029 and D-001 inform the disclosed outage limitation, not a v1 isolation subsystem.
- Escalation: changed hosting/security/data-loss behavior, unsupported current runtime capability, another persisted format needing transformation, required force-unmount/permissions relaxation, source-copy fallback or a discovered normal-connected-operation incompatibility -> return specific Design Impact/Requirement Gap to Solution Designer. Do not weaken an AC or invent migration/security policy in implementation. Architecture review is selected by rules, not by this paragraph alone.

## Change Scope

In scope UC001–007 / BEH001–007: supported native Mac/native Linux/Docker-on-Linux service; native and Docker clients on both OSes; one bootstrap/first-use command; persistent attach/reconnect/safe detach; chosen source mapping; Nodes guide; configured-shared setup/new-run identity checks, normal file/preview/terminal/native runtime compatibility and private skill exposure required to preserve current functionality. SR019 narrows that exposure to private links/current-source availability, not a source-retention or snapshot subsystem. Existing Sources Update/Remove, local source registration and ordinary local-workspace materialization policy are preserved. SR021 adds selected failed-start completion and a bounded consumed-attempt record under the existing setup/Docker owner; no global daemon ordering, generalized supervisor or recreation at boot. SR022 changes only the owned Ganesha export policy, two small hosted-config verification entry points, their focused tests and documentation. It does not change runtime/REST readers, retry behavior or release gates. SR023 changes platform source capture/comparison, tight config identity validation, existing plan/apply/pending/reconnect wiring, focused tests and docs; no other new production owner. Concrete files below.

Leave private databases, memories, provider homes/auth, existing local-only Docker sharing, ordinary local workspace defaults and unrelated runtime policies intact. No embedded desktop helper is necessary: REQ013 permits the selected standalone bootstrap route. No public/SDK/HA/offline-sync product, Windows, automatic notifications/context ingestion, general OS administration UI or parked collaboration work.

Follow-ups: outage-caused stalls of previews/file actions/terminal/runtime and unrelated work (ARCH-REV-001 D-001 plus FR029); future bounded per-action IO isolation/cancellation/recovery, not required for v1. Also Docker Desktop **storage-server** export of a Mac host folder (FR038/053/055); native UNFS RPC/handle defects; encryption/individual accounts/public service; automatic remote file notifications. None of those follow-ups is required to deliver the selected v1. UNFS prototypes remain rejected; SR020 separately selects a narrow accepted-upstream Ganesha compatibility backport, not a custom filesystem. Mac Docker **agent clients** remain in scope. These follow-ups are recorded for the Project Task Manager at delivery, not silently added here.

## Architecture Evidence And Supplements

All paths below are relative to this ticket; full canonical inventory remains investigation-notes.md. Evidence-only supplements do not redefine approved intent.

| Evidence / source | Decision supported | Limit / applicability |
| --- | --- | --- |
| code-review-evidence/crr-012/package-index.json, mac-evidence-review.json and source-trace.md; evidence/api-e2e/api-rev-005/mac-volume-boot-result.json | CR007 supported normal Mac boot refusal with unchanged actual APFS volume/inode | Independent failure evidence; no current fix Pass |
| evidence/design-recovery/sr023/source-identity-investigation.md, primary-contracts.md, prototype-result.json, persisted-state-evidence.json, cleanup.json | Platform-specific identity, actual three-boot and replacement feasibility, explicit bound/unbound state disposition | Disposable dependency prototype only; current public product and physical qualification still required |
| code-review-evidence/crr-010/package-index.json; evidence/design-recovery/sr022/; code-review-evidence/crr-012/visibility-evidence-review.json | Historical CR006 failure/design plus API005 actual Linux native/Docker storage and native/managedHTTP resolution | Resolved only at executed scope; bothOS/physical AC003 still required |
| evidence/design-recovery/sr021/lifecycle-investigation.md; API004 two-reboots and control receipts | Bounded SR021 exact-ID recovery and current stop policy | Prior CR005 is scoped resolved, retained unchanged |
| evidence/feasibility/experiment-index.json, raw fr001–057 | Auditable attempts, exact commands/topology/failures/cleanup | Designer prototypes, not downstream signoff |
| real-agent-roundtrip-report.md, private-runtime-skill-report.md, native-private-readiness-report.md under evidence/feasibility | Actual native agent IO; Claude private plugins; Codex process-wide extra roots and peer-stop/resume | Existing release/SDK proofs, not finished current product |
| evidence/feasibility/macos-vm-feasibility-report.md and raw FR026/028/029/033 (raw rounds authoritative) | Actual Mac+twoDocker same path, operations/locks and reboot/recreation; FR029 outage observations retained | Outage isolation is future evidence, not v1 machinery; no full public command/physicalLAN proof |
| evidence/feasibility/native-folder-hosting-report.md, FR039 | Apple nfsd directly serves chosen nonempty APFS folder to Mac/twoDocker | Full native-server lock/agent/product matrix still validation work |
| evidence/feasibility/backend-correctness-report.md, sr017-selection-report.md; FR038/048–055 | Reject Ganesha on Mac Desktop bind and UNFS portable-server detour | Retain failures; Git is a compatibility test, not sharing mechanism |
| FR057 and current Grok launch/ACP sources | `grok agent --plugin-dir` private skills discovery | Native ACP discovery only, no inference/integrated shared-run proof |
| implementation-evidence/ir-001/source-lease-design-impact.md and source-audit.json; current skills.md/source owners | IMP-D001: source cleanup is independent of link/profile lifetime | Read-only fact, not a new source-retention requirement or failed runtime test |
| Existing workspace/runtime/terminal/file/launcher/REST-preview paths in investigation | Normal data flow and private-runtime cleanup; D-001 actual parent read path | Healthy current-source cross-runtime/preview integration required; no outage-isolation claim |
| architecture-review-scope-feedback.md; approval-record-sr018.md | Exact direct-user working-first scope, DEC015 | Current intended behavior; no new questionnaire |
| approval-record-sr017.md; prior approval records, historical transcripts, setup-revision-context.md | Current authority plus historical user journey | Historical requirements/questions are superseded, not current blockers |
| evidence/ui-reference/docker-guide-user.png | Reuse user's Nodes guide pattern | Not Windows support or an external Product specification |

Independent review history preserved: ARCH001–006, IR001–008, CRR001–012 and API001–005. Current **CRR012 Fail/Design Impact** and **API005 Fail57.14%/broader Required** remain independent authorities. CR001–006 resolutions retain actual scopes, not a full product Pass. Complete raw/history references remain indexed by CRR012/API005 and SR023; no specialist artifact edited. Delivery/finalization **N/A — not yet performed**; external Product specification **N/A — not requested/applicable**.

## Relevant Behavior And Production-Path Map

| Behavior / kind | REQ / AC | Existing path and trigger | Target / preserved contract | Spine |
| --- | --- | --- | --- | --- |
| BEH001 Operational | 001/002/006/013–019; AC001/012–019 | Current public CLI create/reconnect and selected native/Docker backend | Same source; SR020 correct package pair -> unchanged engine/mount/nonroot probe -> actual root/node readiness | DS001/002 |
| BEH002 User/System | 003/004/012; AC002–004/011 | Workspace selection -> standalone/Team/Org -> runtime | Native tools/cwd, normal policies, private configured skills; no fallback | DS003 |
| BEH003 Contract | 002/004/005; AC001/003–005 | OS write/sync/close then peer open | Same filesystem, concurrent different files, coordinated same-file/Git, stated locks | DS002 |
| BEH004 Operational | 007/008/014/019; AC006/007/014/018/019 | Setup/new-run expected path and ordinary machine/daemon restart after completed attachment | SR023 persistent Mac volume+directory proof (Linux pair unchanged), then host and eligible exact selected NFS failed-start completion; normal stopped nodes/private state preserved; outages may stall | DS001/003/006 |
| BEH005 Operational | 009/010/017/019; AC008/009/017/019 | Source/export apply, node recreation, detach | Explicit network/OS/disruption consent; nonroot data mapping and exact preservation | DS001 |
| BEH006 User/System | 011; AC010 | Healthy explorer reload and media/static/completed-artifact preview | Exact mounted content via existing APIs, no unsaved-buffer overwrite; outage isolation deferred | DS004 |
| BEH007 User/Interaction | 020; AC020 | Nodes tab/copy/download | Existing guide pattern, truthful availability, no execution by copying | DS005 |

## Task Design Health Assessment

Posture Larger Requirement; normal-use design issue Yes, root causes **Missing Invariant / Boundary Or Ownership Issue**. Structural triggers: process-local skill-link cleanup across nodes (FR011), path identity missing from setup and native temp fallback, destructive general launcher recreation. Narrow refactor remains for private profiles, known shared-path checks and selected-node lifecycle. Existing workspace registry, file/REST preview paths and process/PTY owners are reused. SR019 corrects a false reuse assumption: no existing source-generation lease exists to reuse. Separate process/profile/link cleanup from independent source publication/deletion; private links are sufficient for FR011 peer-stop while preserving the current no-snapshot policy. No new source owner/refcount/retirement queue is justified.

**SR020 design health:** demonstrated dependency/protocol compatibility failure in a supported normal path. Existing package installation/configuration owners remain correct; replace the defective dependency artifact, not the confined reader. Build-time source provenance and embedded package payloads are the narrow new responsibility needed for one-command distribution of that correction. No runtime compatibility service, global client toggle, fallback or broad application refactor.


**SR021 design health:** Boundary/Ownership Issue. First-use ordering plus Docker restart-policy preservation did not establish boot completion; the reviewed engine/host-only Reconnect boundary was incomplete. Refactor needed now: a cohesive selected-node completion adapter/coordinator, sharing volume inspection and existing probe/API checks. Bounded consumed-attempt state prevents competing repeated Start calls; it never becomes desired-running history. No dependency change, runtime restart-manager takeover, schema migration or outage worker. Structural delta is Medium/High in isolation; cumulative solution remains Large/High due its existing privileged multi-platform surface, not artifact count.
**Explicit deferral:** parent synchronous/async NFS calls can stall during outage (FR029 and ARCH-REV-001 D-001). User DEC015 removes v1 bounded-outage/unrelated-local responsiveness guarantees, so no file/preview streaming workers, per-action probe/queue or shared-cwd trampoline is required now. Healthy path-based readers remain coherent for approved v1. Do not claim the flaw fixed or defer the independent normal-use skill cleanup defect.
**SR023 design health:** Missing Invariant / shared-model lifetime mismatch. OS-assigned raw Mac device ID was incorrectly treated as durable across boots; its source guard and pending recapture need a bounded representation/lifecycle correction, not a new source owner. Existing platform/config/setup boundaries suffice. Small OS-specific capture extraction plus strict binding validation and bind-once pending sequencing; no broad refactor. Cumulative Large/High remains because privileged persisted source identity can export the wrong directory if weakened; delta spans a few cohesive files, not a new subsystem. Experimental evidence supports UUID+inode, not product closure.

## Terminology And Selected Storage Contract

**Source folder** is the ordinary persistent local folder actually exported. **Storage ID** is the UUID marker of that filesystem, not the app's path-derived workspace ID. **Attachment** is a computer/daemon's expected storage ID + endpoint/export + mount root. **Project** is a subfolder selected as an ordinary workspace. **Private runtime profile** contains only configured skills/metadata on one node, not provider auth or project files.

### Supported reference matrix / qualification targets

| Role | Selected backend / client | Source / protocol | Design and evidence disposition |
| --- | --- | --- | --- |
| Native Mac server | Built-in Apple nfsd | Local APFS, NFSv3 TCP | FR039 actual macOS26.6.2 arm64 guest. No Docker dependency. Default Mac serving choice |
| Native Linux server | Ubuntu24.04 Ganesha/VFS4.3 with accepted-upstream directory-op backport (SR020) | Local ext4; NFSv4.1 TCP | Stock4.3-8ubuntu1 fails the current kernel7.0.0-38 reference (API-F002). Selected4.3-8ubuntu1+autobyteus1 from the same distro source plus upstream98eb77c; API003 fresh public native Ubuntu create/reconnect passes, broader qualification remains |
| Docker-on-Linux server | Same corrected Ganesha/VFS Debian package pair in slim Ubuntu24.04 image | Explicit chosen Linux ext4 bind at /export; NFSv4.1 TCP | No hidden data volume. Linux host networking, exact capabilities; direct host-folder and restart validation required |
| Mac native client | Built-in mount_nfs | v3 to Apple / v4 to Ganesha | Actual native VM proofs; full physical desktop installer journey remains |
| Linux native client | nfs-common kernel client | v3 or v4.1 as descriptor specifies | Ubuntu24.04 reference; package install automatic, systemd lifecycle |
| Mac/Linux managed Docker agent | Docker local-driver NFS volume | Same endpoint/protocol/storage ID; common container root | No privileged agent or per-container setup; Mac Desktop daemon reaches server separately from host mount |

Default `/Volumes/autobyteus-shared`; e.g. project `/Volumes/autobyteus-shared/project` on every client. Linux creates an ordinary directory with that name. Never default to `/tmp`. Safely occupied default -> explicit alternative/root mapping or refusal, never hide contents. Only one attachment/default filesystem is needed for v1, not a multi-storage registry.

Reference binaries are built for Darwin/Linux arm64/amd64; advertise only actually qualified combinations in the release manifest. Minimum new package reference is macOS26 / Ubuntu24.04, local APFS/ext4; older OS/other distributions/filesystems are not automatically promised. Exact package revisions, engine image digest, Docker Desktop/Engine and CPU are recorded by CI and delivery. Engine/dependency changes require fresh full-mode evidence and locked package/image manifests, not an unbounded apt upgrade on reconnect. The observed Ubuntu24.04.5/kernel7.0.0-38/ext4 combination remains required; no new kernel ceiling is introduced. Stock4.3 is not an acceptable fallback. Unsupported host role fails before mutation; Docker-on-Mac server choice explains use native Mac instead. No custom filesystem/UNFS patch/FUSE dependency.

### SR020 — selected Linux compatibility recovery (CR003 / API-F002)

**Supported path and root cause.** Normal native Ubuntu create, not an outage, installs the selected engine then hard-NFS4.1 self-mounts and runs the exact nonroot confined marker probe. API002 fails twice at ordinary directory traversal; CRR005 reproduces outside Go with default directory delegations. `ReadMarker`/`os.Root`/UID/squash are not the broken owner. Upstream accepted98eb77c4fd94effa6882b214698a77752ec79f6e maps recognized GET_DIR_DELEGATION to existing NOTSUPP handler/free function rather than ILLEGAL. Linux's supported-operation negotiation can then handle an unavailable optional feature. The original API wire sequence remains inferred, not captured. Facts/prototype scope: evidence/design-recovery/sr020/compatibility-report.md. Two fresh candidate creates complete; final attempt also completes two reconnects and60 directory replays on unchanged defaultY. No manual client tuning, but packages are preinstalled for this dependency prototype; that prototype did not qualify the bundled installer. IR005/006 and API003 now provide fresh native-Ubuntu public install/create/reconnect proof without engine preinstallation; published bootstrap/amd64/full role qualification remain open.

**Decision.** Use the current Noble distro source `nfs-ganesha4.3-8ubuntu1`, its distro patches/build rules, and only the two upstream dispatch-field replacements, with distinct binary/source package revision **4.3-8ubuntu1+autobyteus1**. This is a maintained, explicit backport in this product's release inputs—not pretending the stock distro package contains the fix. Do not install unpatched4.3, change the Linux `directory_delegations` parameter, patch Go confinement, add blind read retries, change protocol, downgrade the kernel, or silently exclude this Ubuntu reference. Native and Docker-on-Linux storage consume the same correction. Mac Apple storage and client configuration unchanged. Updating to a future upstream package is a separately qualified replacement, not a reconnect download.

**Why smallest.** The accepted fix already targets the observed interoperability boundary, and V4.3 has the required NOTSUPP handler. A major jump to V9.13/9.14 would change many unqualified server/FSAL/dependency contracts; current bounded official-package discovery found Noble PPA7.0 predating this fix, not a ready corrected Noble package. Global client tuning changes every server relationship on the user's host. Neither is justified over a two-field server backport. Source/package distribution does add explicit maintenance; it does not create a general package manager, new filesystem engine or public service. No requirement or security-mode change is needed; the designer owns this technical selection under ApprovedSR018.

**One release-owned package path, not a new user setup step.**
1. `packaging/engine/` owns a checksum-locked source recipe: original distro `.dsc`, original tarball, Debian delta, accepted commit/diff with provenance, exact package version, build environment and build-dependency inventory. Verify all source hashes before building; reject a patch context mismatch. Build both native architectures using the distro recipe and a recorded toolchain, fixed changelog/source timestamp (`SOURCE_DATE_EPOCH`) and dependency inventory. The prototype does not establish bit-reproducible builds; release must verify the locked output bytes rather than assume reproducibility. Only `nfs-ganesha` and `nfs-ganesha-vfs` runtime packages are consumed; their other dependencies remain distro packages. Do not ship development/debug/other-FSAL packages merely because the source build produced them. Supply complete corresponding modified source/build instructions and applicable notices as versioned release artifacts; do not rely on an ephemeral upstream link or label patched binaries as stock Ubuntu.
2. The existing build-only release flow builds this pair for arm64/amd64 once per candidate. Record package name/version/architecture/SHA256 plus source/recipe inputs in the **release-owned engine manifest**, and use those exact artifacts for both native binary and Docker image. The typed engine manifest contains source/patch identity and per-architecture pairs of fixed name, version, SHA256 and size; it is build/release metadata, not stored workspace state. Populate immutable package identities in release-lock/metadata; production source hashing includes recipe, patch, source inputs and locked package identities. Qualification concerns the actual candidate bytes. A rebuild with changed package hashes invalidates qualification; never silently reuse an old Pass or generated qualifiedTargets. No package publication is permitted before existing qualification/user/release gates.
3. Bundle only that Linux architecture's small pair **inside the compiled Linux CLI** (generated embed assets, not source-tree checked-in `.deb` files). Validate bundle/archive/member sizes at build time within the existing100MiB installed-binary bound. Existing root installer copies the whole verified binary, so no new user-controlled sidecar survives privilege elevation. The ordinary four-member install archive, Mac artifact, root-owned binary handoff and one-command bootstrap shape stay unchanged. Release manifest carries both architecture identities so existing downloaded-versus-embedded equality remains coherent. Build-only/development metadata without a complete matching bundle is unqualified and cannot silently obtain stock engine packages.
4. Existing `backend.InstallUbuntuPackages` remains the installation owner. A cohesive bundle reader validates exact expected name/version/architecture/hash/size before any engine install, then materializes only those embedded bytes in an exact-owned0700 directory/0600 files beneath private service state. No caller paths, URLs or arbitrary package names. Run APT against these absolute local `.deb` paths plus the pinned `nfs-common` and distro dependencies, within the existing consented apply/admin lock and temporary default-unit mask. Requery exact versions after install, including when a package was already present. Reject mismatched/missing bundle or wrong architecture; no network fallback for the engine. Preserve refusal of unrelated active Ganesha and existing mask/receipt cleanup. Remove only owned staging files on completion/failure; retain mask uncertainty as currently designed. Normal failures remain incomplete, never READY.
5. Docker's engine image installs the identical corrected pair from CI artifacts instead of `apt install nfs-ganesha=<stock>`; retain pinned Ubuntu base, source/config/recovery bind layout, nonroot all-squash/allowlist and capabilities. It needs no embedded CLI, compiler, extra FSAL or host Docker socket. Package inventory/notices and image digest identify the exact build. The daemon's Linux kernel NFS client remains unchanged.
6. Reconnect/service startup does **not** install/upgrade packages, alter kernel settings or downgrade protocol. Preserve current owned service/config/source UUID and operator consent. This unreleased feature has no published pre-backport product state to migrate; no project, attachment or source-byte migration is introduced. Installation dependencies are not automatically purged on detach (existing policy), and user data/recovery is never removed to change package revision. Missing prerequisites remain truthful failure, not an implicit substitution.

**Owners/spines and preserved code.** DS001 bootstrap -> trusted root binary -> typed plan/consent -> existing Ubuntu package installer with validated embedded pair -> existing source/engine/mount/nonroot probe -> job/ready. DS002 remains direct OS NFS data IO; no new data-plane service. Packaging controls build inputs/immutable bytes; backend controls their installation, setup controls sequencing; no second lifecycle owner. `config.ReadMarker`, `service.NonrootProbe`, `platform` mount/identity/confinement code, Apple cold-start fix, runtime profiles and previews are unchanged by this correction. No per-file compatibility shim or startup registry/cache.

**Validation order.** Implement/package with focused exact-source patch/package/bundle validation and failure fixtures, then applicable source review. API-F002 public **create and reconnect first** on fresh Ubuntu24.04.5/ext4/kernel7.0.0-38 with default directory delegation **Y**, native nonroot1000:109/no supplementary groups, nonempty original source, hard4.1, UUID/content/private modes/job assertions. Unlike the designer prototype, this must run the new one-command path with **no manual engine preinstallation**, no probe bypass or workaround. Include old-dispatch negative evidence, mismatched/truncated/wrong-arch bundle rejection before engine mutation, exact mask restoration, clean-machine native and Docker package parity, both release architectures and runtime dependencies. Continue the full native/Docker/client/peer/restart/detach/file/lock/Git/runtime/desktop/physical/user-verification matrix. The prototype is not an API Pass, package installer test, Docker/amd64 or physical qualification; stock4.3 and prior failed logs stay visible. No blanket aggregate confidence upgrade.

### SR022 — end-to-end healthy freshness and owned-config lifecycle

**Retained accepted/implemented design:** ARCH006 / IR008. API005 independently closes
CR006/API-F004 for Linux native and Docker STORAGE with native+actual managedHTTP readers
(40 unique fixtures/80 checks, all<=5s). The original implementation/validation wording
below records that correction; its API-first order is superseded by SR023 for this round.
No full bothOS/physical AC003 closure is inferred.

**Decision/owner.** In existing `backend.GaneshaConfig`, emit `Attr_Expiration_Time = 0;`
at the owned **EXPORT** level for native Linux and Docker-on-Linux storage. No CLIENT
override, global/unrelated export change, extra policy registry or user setting.
Retain existing native/Docker `hard,tcp,vers=4.1,actimeo=1` (Docker nosharecache),
all-squash/allowlist, source path/UUID, corrected4.3 package pair, kernel and protocol.
Apple nfsd configuration is unchanged. The native and Docker clients on BOTH OSes
remain required; shared generator reuse is not evidence every mode passed.

**Why.** Exact4.3 source defaults server attrs to60s. Client1s alone cannot discover
an original-source write when the server returns old change attributes. Expiry0
forces the server's attribute path to refresh from VFS; this avoids an additional
server TTL/delegation validity window. The controlled SR022 A/B/A experiment on exact
retained packages supports this choice on native Linux: unique warmed fixtures stay
stale with default policy, become current within5s with zero, and stay stale again
with restored default. Candidate covers1KiB/1MiB in-place, atomic replacement and
negative-lookup creation. See raw timings/limits, not a blanket eventual-consistency
or performance claim. Extra backing metadata calls are the explicit correctness-first
tradeoff. No byte proxy, cache flush, app read retries, watcher or new runtime owner.

**Current public lifecycle.** Fresh Apply writes the corrected generated bytes before
engine activation using current WriteGanesha/InstallGanesha; current exact repeat is
a no-op. Reconnect/service continue exact VerifyGanesha before existing EnsureGanesha
or EnsureEngine and then the same mount/nonroot/selected-node checks. Status adds an
existing-owner VerifyGanesha check for a hosted native/Docker Ganesha configuration
before HostReady; status never writes config or restarts. Connect-only and Apple paths
remain unchanged. Detach preflights an **existing** hosted Ganesha config with the same
verifier before detachNodes/unmount/job/engine mutation; absent config is allowed for
safe retry of already-partial owned teardown. Existing exact unit/container/removal
checks still apply. Different/malformed existing config is retained with error and no
teardown; no unconditional overwrite or late mismatch after teardown has begun.

**Generated-state disposition.** This unreleased first delivery has no evidenced
published NFS predecessor: qualification/release fields remain empty, known old runtime
fixtures were cleaned up, retained files are unqualified test candidates. No persisted
source/marker/attachment/project/session format changes. Current different config bytes
(including old test templates omitting expiry0) remain refused by Write/Verify, not
silently called an upgrade. Dispose/recreate owned old candidate fixtures by public
drained detach with their matching old candidate **before** installing the new one,
then create against the same preserved nonempty source/marker. Do not automatically
rewrite a user's file or delete source/recovery data. If an actual retained supported
deployment is discovered, return concrete transition evidence to Solution Designer;
do not invent a compatibility reader or migrator. Same-current repeat/restart remains
automatic as approved; no extra end-user first-install step is introduced.

**No hot update.** Merely replacing generated bytes is insufficient: Docker has a
read-only single-file bind and existing Ganesha cache entries retain their expiry.
This revision does not implement live config migration/SIGHUP/restart orchestration.
Fresh engine activation consumes the current template; existing exact current configs
are reusable. An externally changed file is not authority to silently reconfigure a
running service or claim loaded-policy verification.

**Files and clean-cut boundary.** Change `internal/backend/ganesha.go` (the one generator),
`internal/setup/status.go` and `internal/setup/lifecycle.go` (thin calls to current
verification owner), existing backend/backend_test.go, backend/cleanup_test.go and setup/setup_test.go (or adjacent focused setup tests), and NFS README/operator/test guidance.
If missing-vs-present preflight needs a small helper, keep it with existing backend
config ownership, not a new cross-layer framework. Keep WriteGanesha/VerifyGanesha
strict byte comparison and0700/0600 policies. No change to Docker node recovery,
restart intent, daemon config, node images/ports/private data, mounts/volumes, source
identity, native runtime profiles, REST handlers, frontend or engine build recipe.
Normal source-hash/release metadata regeneration belongs to implementation packaging;
reuse exact engine packages, do not rebuild the engine for a config-only change.

**Verification and sequencing.** Selected architecture review -> implementation ->
independent source review -> API/E2E. First independent API case is API-F004 on fresh
public native storage: prime two actual readers with old bytes, direct source unique
in-place write/fsync/close, then fresh native and actual managed-node HTTP opens;
record per-reader elapsed time and exact bytes for repeated1KiB and1MiB fixtures under
unchanged5s, no manual config edit/dropcache/remount/retry workaround. Capture generated
and actually used config/engine invocation, package/CLI/image/mount identities, source
inode/device/owner/mode/UUID and private preservation. Then atomic replace/new/delete/
rename/directory/symlink and client-to-client directions under existing ACs; validate
both Linux STORAGE forms and both OS native/managed clients and healthy previews.
Retain API004 negative evidence rather than require an unsafe user downgrade.

Focused implementation tests: native/Docker templates each contain exactly the export
option; absent/current/different config Write/Verify outcomes; Status mismatch never
HostReady; Detach mismatch produces no node/mount/job/engine mutations; missing config
supports exact-owned partial-detach retry; public current repeat/reconnect remains
idempotent. Assert unchanged source/client options/security and Apple/connect-only
behavior. Do not validate only by string matching: actual repeated source-write reads
are mandatory downstream. Preserve SR021 two-boot/normal-stop/current-policy-no/
unselected/launcher-replacement/drained-detach regressions; do not turn60s observed
reboot completion into a new SLA. Full existing physical/native-tool/preview/user/
release gates remain. No independent API or source Pass is issued by this design.

### SR023 — reboot-stable Mac source binding (CR007 / API-F005)

**Approved scenario and cause.** SCN009/012/013, BEH001/004/005,
REQ014/017/019 and AC007/014/017/018/019 already require ordinary healthy restart
against the same original source without manual mounting, while refusing replacement.
Plan -> platform.SourceIdentity -> private hosted/pending records -> launchd service ->
Reconnect -> CheckSource currently persists/compares raw st_dev+st_ino on both OSes.
API005's unchanged APFS source retains volume UUID/inode/bytes while st_dev changes
across three ordinary boots. The comparison correctly follows an inadequate design;
this is not an IR008 regression, requirement change or request for more retries.

**Identity and owner.** Keep one tight `config.Identity` value with mutually exclusive
backend-specific volume identity: `{volumeUuid, inode}` for Apple/APFS;
`{device, inode}` for Linux/ext4. Add `VolumeUUID string` (`volumeUuid,omitempty`) to
existing Identity, make Device omittable for Apple, retain uint64 Inode. Existing
HostedFilesystem.Backend selects the variant; do not add a second platform selector,
schema version, magic sentinel or reinterpret Device. Apple requires canonical lowercase
nonzero volume UUID, nonzero inode and zero/absent Device. Linux requires positive
Device/inode and empty VolumeUUID. Mixed/partial/unsupported forms fail closed. The
all-zero identity is permitted ONLY for a not-yet-bound `NewSource` setup intent, not
for hosted config/readiness. Separate metadata validation from complete binding
validation so planning a nonexistent source remains possible. Linux identity semantics
and JSON fields remain unchanged; this correction does not claim a universal Linux
filesystem/device lifetime guarantee beyond the approved tested reference.

`platform` owns capture and comparison; `config` owns shape validation; `setup` owns
when a binding is established/persisted. For Mac, retain canonical path/ancestor/real
non-symlink directory guards, then open the directory with O_DIRECTORY|O_NOFOLLOW.
Fstat/Fstatfs on that descriptor determine the directory inode, local APFS qualification,
actual mounted device and volume mountpoint. Raw device is used only to correlate the
path/fd observations in this one capture, never as a saved cross-boot Mac identity.
Invoke the existing trusted Runner with fixed `/usr/sbin/diskutil`, separate arguments
`info`, `-plist`, and the actual Fstatfs mounted device. No shell, guessed disk number,
directory-as-device query, PATH lookup, user-selected command or full-disk enumeration.
Use the same root-owned executable/trusted path and clean environment policy as other
platform commands. Existing CLI remains CGO_ENABLED=0 on both Mac architectures; no
user compiler, new install dependency or raw syscall/assembly bridge.

Decode a bounded (at most1MiB accepted) XML plist with standard encoding/xml inside
this platform owner. Require one complete plist/dict, unique keys, valid key/value
pairs and correctly typed DeviceNode, MountPoint, FilesystemType and VolumeUUID strings;
ignore unrelated extra fields without accepting duplicate/ambiguous required values.
Reject malformed/trailing documents, absent/zero/invalid UUID, non-APFS or mapping mismatch.
DeviceNode and MountPoint must equal the same descriptor's actual mount observation.
The observed system plist has **no Mounted key**; do not invent that requirement or
substitute DiskUUID, container UUID, volume name, fsid or st_dev for VolumeUUID.
Revalidate current canonical path/real directory, raw dev+inode and descriptor mount
identity after the command. If the observation changes or command fails, report a source
identity error with no export/mount/identity rewrite. Close the descriptor on every path.
No cache across reconciliations; a fixed extra system command per capture is the bounded
cost. No generic command-runner overhaul, retry/watch framework or new supervision owner.

The binding comparison uses both persistent volume identity AND directory inode. The
existing independently checked storage marker/UUID and nonroot read/write/fsync checks
remain necessary; a copied marker or identical bytes never authorize a new directory or
volume. This is normal same-source protection, not cryptographic proof against a
privileged actor cloning/spoofing filesystem UUIDs or a new atomic hostile-mount-race
security guarantee. APFS clone images can share a volume UUID; no stronger claim is made.
Privacy/system-path exclusions, source/target separation, current ownership, OS privacy
and normal permission refusal remain. No permission widening or new volume support.

**Lifecycle and pending-state invariant.** Plan captures existing source identity and
qualifies a new source's existing parent through the same platform owner. Apply validates
complete planned identity before exporting; for a new directory, capture it once after
successful nonroot CreateSource, clear NewSource, and atomically save this bound intent
using existing SaveIntent before subsequent marker/handle/export work. Preserve the
existing final hosted write before export and normal attachment/job/backend order.
If persistence fails, stop before export; no claimed cross-resource transaction.

PendingPlan must distinguish unbound intent from established binding, not recapture on
a stale NewSource flag. A complete current binding is compared to the actual source and
reused unchanged; NewSource is cleared for its resumed plan. A genuinely all-zero
NewSource intent may capture a now-existing directory only as first binding during the
existing fresh plan/consent path, after normal path/filesystem checks. If source is still
absent, retain the original new-source intent. Partial/malformed/old bound Apple identities
must not enter the unbound case. If a hosted record already exists alongside an unbound
pending intent, refuse the inconsistency rather than infer/rewrite identity from the
current path. Persist the resumed binding before later apply side effects. These are
small changes to existing pending/apply owners, not a new journal or automatic migration.
The supervisor still refuses pending recreation; only the existing consented retry owns it.

Completed CheckConfiguration validates the backend-appropriate complete binding. Reconnect
then checks observed identity before Apple Ensure/mount, including automatic launchd
and explicit reconnect. A mismatch never updates stored identity or falls back to the
marker. Status can report the validation error without writing; no new status-driven
source repair. Detach retains its current non-forced/exact-owned teardown (not a new
live-source-availability requirement); predecessor fixture cutover is below. Serial
supervisor cadence/OS startup, mount options, Apple export startup correction, Ganesha
expiry0, Docker stop/reboot safeguards, node data and application admission are unchanged.

**Persisted-data decision, not migration-by-schema.** `persisted-state-evidence.json`
records local origin/personal without this new package, no local tag containing its first
source commit, empty qualifiedTargets/qualifiedSourceHash/physicalEvidence and publish
refusal. Known installed device-only records are unqualified owned API fixtures; API005
reported their exact cleanup. This establishes no supported released predecessor in this
package, NOT a global absence proof about arbitrary installations. The repository migration
guideline and real predecessor were read before deciding; server migration machinery does
not own standalone NFS config and no application startup migration gate is appropriate.

- Project bytes, source marker/storage UUID, attachment/public descriptor, selected node
  private data, runtime profiles and current Linux bound records: directly usable, no
  migration or format/meaning changes. Linux is not forced into a new UUID representation.
- Complete current Apple UUID+inode hosted/pending records: directly usable across normal
  boot/reconnect; no durable raw-device refresh. Complete identity is never recaptured.
- All-zero NewSource pending intent without hosted state: directly usable as an unbound
  intent under the lifecycle above, not evidence of any already-selected directory identity.
- Old device+inode-only Apple hosted/bound pending fixtures: NOT safely convertible because
  original capture never stored the volume UUID. Never infer from current path on mismatch
  or accept the old pair as a fallback. Drain/detach with the matching old candidate BEFORE
  installing the new candidate; then fresh create on preserved nonempty source/marker,
  reusing the storage UUID. This is exact-owned unqualified fixture rebuild, not automatic
  user-state deletion or an extra first-release user install step. New readers give an
  actionable unsupported-binding diagnostic and make no mutation to such records.
- If actual supported retained installation evidence appears, return it for explicit
  transition/approval assessment before cutover; do not invent a migrator, compatibility
  parser, backup policy or data-loss permission. Never edit identity by hand for acceptance.

**Files and clean cut.** Extend config/state.go (Identity and validation; cohesive
config/source_identity.go extraction allowed), platform/source.go (common path checks and
comparison), add platform/source_darwin.go and source_linux.go (OS-specific capture),
and wire existing Runner through setup/plan.go, apply.go, pending.go and lifecycle.go.
Keep capture/test seams at the platform command boundary, not injectable per-caller policy.
Complete-config checking remains in its current setup/apply.go owner. Reuse filesystem
qualification, source-marker, protected Store and Commands; do not duplicate them. Add
adjacent config/platform/setup tests and narrowly update NFS README/testing instructions.
Remove unconditional cross-OS dev+inode equality and bound-pending recapture; no second
legacy Apple acceptance path. No backend/engine/release-workflow/REST/UI/runtime-profile
production edits are prescribed. Packaging may regenerate current CLI/source metadata with
retained exact engine bytes; no engine rebuild or qualification claim.

**Validation order and scope.** Architecture review of this delta -> implementation
self-checks -> selected independent source review -> independent **API-F005 FIRST**:
current public native Mac fresh create, at least two ordinary whole-host boots (additional
boot if needed to witness raw-device reassignment), automatic mounted nonroot read/write
without manual mount/service repair/reconnect, then separately labelled public reconnect.
Record distinct boot IDs, actual APFS volume UUID and directory inode, raw device as
observation, saved binding bytes, original project/marker/hash/modes, installed CLI/OS/job/
exports/mount/private-state proof. Demonstrate current public refusal for same-path different
directory and different actual APFS volume even with copied marker/content, plus symlink/
privacy/permission controls; restore exact owned originals without identity editing. Preserve
source on detach. Synthetic field edits and the disposable probe are not this acceptance.

Focused durable tests: strict variant/UUID parsing including mixed/missing/zero/wrong-type/
duplicate plist keys, wrong device/mount/filesystem, command error, changed observation,
fd cleanup and symlink guards; Mac dev-change plus stable UUID/inode matches, changed UUID
or inode refuses; Linux pair and nonroot/path rules unchanged. Cover existing-source Plan,
new-source Apply bind-before-probe failure, complete pending identity reuse/refusal, stale
NewSource with complete identity, genuinely unbound retry, old/partial binding refusal,
hosted/unbound inconsistency, saved record unchanged on mismatch, and reconnect refusal
before backend/mount effects. Unit fixtures are not Mac boot evidence. No hard-coded device
numbers or new polling/reboot SLA. No production remedy that edits saved identity to match.

Retain proportionate CR005/API-F003 and CR006/API-F004 regressions (both Linux storage
forms, native+actual managed HTTP fresh reads<=5s; selected reboot/Stop/policy/replacement/
detach). Their API005 scoped resolutions remain valid. Then all remaining approved
both-OS/client/independent physical/native actual-tool/private-linked-asset/peer-close/
restore/Standalone-Team-Org/healthy preview/completed-artifact/release/user gates. CRR012
and API005 remain Fail until their owners issue replacement verdicts. The design experiment
supports the identity choice only; it is NOT fixed product/API/physical qualification.


### Data identity, permissions and network

Create writes an exclusive UUID record `.autobyteus-nfs/storage.json` under the selected source and establishes an owned health-probe subdirectory. Existing marker conflict never overwrites/regenerates identity. Source selection refuses filesystem root, home root, private app/runtime/auth trees, another network mount, inside/above the client target or unavailable/nonpersistent backing. No recursive chown/chmod. Existing source requires the chosen nonroot owner to have needed access; a new folder is created for the initiating user with private/group modes (not0777). Mixed inaccessible files remain a diagnosed permissions failure, not a mass rewrite. Marker and OS mount source identify accidental mismatch, not a cryptographic guarantee against trusted hostile admins.

Ganesha `Access_Type=None` default, explicit CLIENT allowlist, `SecType=sys`, `Squash=All_Squash`, anonymous UID/GID set to selected source owner (not hardcoded10001). Apple `-mapall=<selected nonroot uid>:<gid>` plus exact selected hosts/private subnet. Every authorized client's writes use that identity, including container root. No client-root export or per-user isolation claim. Read-only private mode files outside source are never exported; symlink escapes do not expand export authorization.

Native/server setup explains **unencrypted coarse host trust**, displays detected private LAN and offers selected address/range; disallow public/wildcard defaults. Connection metadata is not an access token. An allowed private subnet trusts all computers in it; an exact-host policy is narrower. NAT makes that policy computer-level, not container-level. Linux Docker **server** uses host network to avoid inbound Docker gateway masquerading as client identity; no application data relay. Mac Docker clients may appear as the Mac; that's the authorized participant. Never authorize a generic gateway on behalf of unknown remote clients. Current private topology must pass unauthorized-host test before ready/publication. No automatic router/UPnP/public-port opening. Required host firewall changes are bounded, displayed and consented; preserve existing rules.

Ganesha v4.1 TCP2049 only; stable export pseudo `/autobyteus/<storageId>` and durable private recovery state outside source. Native Apple uses TCP NFS2049, mountd20048 and RPC111; preserve OS-owned nfsd and unrelated exports, parse/validate marked entry before reload. Use fixed owned settings only if they do not invalidate existing exports; conflict -> explicit refusal, not disable existing service. Native Apple Docker-client support may require non-reserved mount-source ports; allow only within the explicit coarse host-trust policy, with selected settings displayed and existing-export conflicts rejected. This is not an authentication guarantee. No wildcard Bonjour discovery. Mac source folder on APFS keeps native case/Unicode semantics: cross-platform users must not assume case-distinct names work on a case-insensitive export.

### Filesystem semantics

Hard TCP mounts, explicit protocol, client attribute bounds `actimeo=1`; owned Ganesha exports use server `Attr_Expiration_Time=0` under SR022 (Apple unchanged); Linux `timeo=50,retrans=2` and per-client independent mount for tests, Mac equivalent supported options. No soft fallback because write integrity matters. Kernel retries and current parent application IO can stall; v1 offers no bounded per-action response/cancellation guarantee. Fresh open after successful fsync/close must meet AC003<=5s for<=1MiB test fixtures; already-open/in-progress writes and remote watch events have no instantaneous guarantee. Same-export rename/replace and exclusive creation must pass. Relative in-project symlink and execute-bit support required; cross-OS build artifacts not portable by implication.

Ganesha v4 cross-client POSIX advisory locks are a supported validated target (FR028). Apple v3 reference deliberately uses local advisory locking (`locallocks` on Mac / `nolock` on Linux) and does **not** advertise cross-client flock/fcntl protection; no NLM callback/firewall dependency for v1. Exclusive create remains a cross-client obligation, and same-file/Git operations remain user-coordinated. If a project requires distributed advisory locks choose the Linux service. Test exact native client options before advertising, never silently disable promised locks. This is within REQ005's documented lock contract, not removal of ordinary projects.

Git is not installed/executed as setup readiness. Where squashed ownership differs from the runtime user, add **only the verified selected project** to that child process's `GIT_CONFIG_COUNT/KEY_n/VALUE_n` safe.directory environment, preserving existing entries and policy. No global config, `*`, project init/chown or system-directory trust. Managed terminals inherit the same scoped environment. Other external terminals are ordinary OS clients and documentation explains their trust policy when applicable. Coordinated Git init/status/add/commit across Mac/Linux remains a controlled compatibility suite.

## Spines, Narratives And Ownership

| Spine / kind | Chain and narrative | Main-line owner / lifetime | Off-spine boundary |
| --- | --- | --- | --- |
| DS001 Primary | command -> plan -> selected consent -> apply -> OS service -> verify healthy connection -> usable path. Create once or connect each computer, then terminal exits | SetupService owns selected resource plan/apply; supervisor owns persistent desired attachment; engine owns storage bytes | Platform elevation, config persistence, selected-node preservation |
| DS002 Primary | ordinary tool -> OS mounted client -> LAN NFS -> source; another client fresh-open reads same bytes | OS client/backend data semantics; not app API or copy process | Source identity/allowlist/cache |
| DS003 Primary | existing workspace/new-run request -> expected mount/path check -> private skills -> existing runtime/process -> native tools | Existing standalone/Team/Org/runtime owners and exact process leases | Shared binding check and private profile; no per-action outage owner |
| DS004 Primary / Return | healthy mounted workspace -> existing explorer/core/terminal/native or content/static/run-artifact REST reader -> OS NFS -> existing result/HTTP stream -> UI | Existing filesystem/HTTP/PTY/runtime owners; no new shared action worker | Current auth/path/projection/MIME/error/stream semantics retained; outage stalls explicitly deferred |
| DS006 Primary | ordinary restart -> OS job/admin lock -> SetupService storage/host proof -> selected failed-start completion -> same-ID Docker Start -> API/shared-binding ready | SetupService sequences; Docker adapter owns eligible start completion; Docker keeps running-process policy | Current selected ref/daemon/volume/state; no receipt-derived run intent |
| DS006-L Bounded local | serial tick -> current eligibility -> isolated daemon probe -> reinspection -> consume failed incarnation -> one Start/verify -> per-node result | Docker start completion under existing admin lock | One bounded private consumed-attempt record; no queue/event replay/global watcher |
| DS005 Primary | Nodes tab -> pure release/command descriptor -> display/copy/download -> user's terminal -> DS001 | Existing Vue panel/copy lifecycle; not storage controller | Release availability/localization |

Return/events: service reports per-host/node status/root, existing explorer/REST paths return current tree/content/stream results, existing runtime/PTY streams retain current APIs. Watcher child may emit available events but manual reload is authoritative. No cross-node messages or automatic context ingestion.

Thin entries: Go main, bootstrap, web guide, GraphQL/REST/WS routes only translate inputs/output. They do not own source deletion, NFS privileges, runtime processes or retries. Desktop/server shutdown is not authority to stop shared storage. Workspace unregister remains metadata-only.

## Service, Install And Docker Lifecycle

### Distribution / first invocation

`autobyteus-nfs/` is a Go module with a compiled control binary (no cgo/custom filesystem); user needs no Node/Python/Go/compiler. `scripts/public/nfs/install.sh` detects supported OS/CPU, downloads a **versioned** release manifest/archive privately, checks checksum and member paths, installs a versioned binary, then executes its absolute path. One invocation completes install and guided service setup; no follow-up PATH/source/mount commands. Read prompts from `/dev/tty` even when bootstrap source is piped. No TTY and missing input -> explicit error. SIGINT only cleans owned download scratch. A downloaded user-writable binary is never used as a root startup job: administrative apply installs a root-owned fixed binary first.

Assets `autobyteus-nfs-<version>-<os>-<arch>.tar.gz`, manifest and SHA256SUMS plus slim Linux image digest. `.github/workflows/release-nfs.yml` follows existing repo version/tag and RELEASE.md; manual build-only mode must not publish. Tests/smoke on advertised architectures, signed/notarized Mac distribution per release policy, backend licenses/notices. Ubuntu client/runtime dependencies still come from the approved distribution repository within the same consented flow. Native Linux hosting installs the checksum-locked corrected engine packages bundled in the Linux binary; Docker storage uses the identical per-architecture package pair. No extra user install command, PPA, host compiler or separate package repository. See SR020 delivery contract below. Mac uses system engine. No independent release stream. Checksums do not claim protection from publisher compromise. No working URL/command is claimed before publication.

No-args unconfigured command -> Create/Connect; configured -> current status/actions. Explicit `create`, `connect`, `status`, `reconnect`, `detach`, `version`, `--json` use same owners, not extra mandatory steps. Create asks source/deployment/private network; connect parses printed bounded connection metadata (storageId/address/export/protocol/ports/root), never evaluates it as shell or treats it as authentication. Managed Docker selection and necessary stop/recreate approvals are part of the same flow. The storage computer must remain powered/online.

### Configuration and supervisor

Private root-owned config `/Library/Application Support/AutoByteusNFS` (Mac), `/var/lib/autobyteus-nfs` (Linux); fixed root-owned executable under corresponding libexec installation directory. `hosted-filesystem.json`: installationId/storageId/source/backend-specific identity (Mac APFS volumeUuid+inode; Linux device+inode)/backend/dataUid+gid/allowlist/owned OS resources. `attachment.json`: installationId/storageId/endpoint/export/protocol/mountRoot/selected node references. Atomic exact writers, known-field readers; no schemaVersion/persisted READY. Private recreation receipts may include Docker env values:0600, never shared/logged.

Public read-only **nonsecret** `/etc/autobyteus-nfs/attachment.json`: expected storageId, local mount root and backend endpoint/protocol/export. Bind into selected nodes read-only; use a descriptor directory bind plus atomic file replacement so updates aren't trapped by an old bind-mounted inode. Applications read lazily during new-run/restore preparation, not every file operation or active turn; malformed existing descriptor fails closed for its configured path, not silently local. No descriptor means existing ordinary local behavior, not proof arbitrary similarly named directories are shared. No global workspace scan.

Mac launchd / Linux systemd start `autobyteus-nfs service` with fixed arguments/config; the private supervisor reconciles its source/mount/engine and, after positive dependency proof, completes only eligible selected-client NFS failed starts under SR021. Docker still owns running-process restart policies. Engine/source precede host mount; daemon-volume proof precedes a client recovery Start. First-use ordering alone is not a boot dependency guarantee. Native Ganesha uses a dedicated owned unit/config, not overwriting unrelated instance. Docker service state/config separate from /export, restart policy persistent; no mount of entire host/private data or Docker socket into backend. Source qualification calls Linux file-handle APIs in owned child before export; container gets only required capabilities (including DAC_READ_SEARCH plus conventional process/data-UID transition needs), not blanket privileged mode. Port/engine conflict refuses before apply. Native Apple remains OS-owned with marked export/settings changes and validated reload.

Mount target preflight: inspect OS mount table first; missing target must be empty/owned and nonwritable to ordinary users when unmounted. Source/target cannot overlap. Wrong mount/source -> refuse rather than force replacement. Reuse normal kernel mount/reconnect and launchd/systemd engine startup, one owned outstanding mount/check attempt at a time; do not duplicate resources on repeat or forget a still-running administrative child. No elaborate retained per-action process pool, mount watchdog, forced outage cancellation or guaranteed recovery deadline in v1. Failed/pending attempt stays incomplete, not ready. Service/OS restart when network is healthy reconnects the saved source/UUID and completes the eligible failed selected-client start below, never resets storage or starts an ordinary intentionally stopped node.

Readiness for first-use/status/new connection checks actual mount/source/protocol, marker and unique create/fsync/read/remove in an owned health directory under intended nonroot user. Setup subprocesses and OS jobs keep exact normal ownership/cleanup, but are not a guarantee that hard-NFS calls can be interrupted. Do not run Git/init a user repository as health check. Host and each selected node have separate results; declined/unavailable node isn't printed ready. During lost storage the check itself may wait: print checking/incomplete and document restoring storage before status/reconnect. No per-file or per-preview verification protocol is added.
Detach drains relevant work with explicit disruption approval, refuses busy unmount, and removes only exact owned jobs/config/empty target after actual success. No force/lazy unmount, recursive permission rewrite, storage deletion or named-volume deletion. Preserve source and marker. For Apple shared global setting changes, restore only if value still equals owned applied value and restoring won't damage other exports; otherwise report retained external/shared setting. Never disable nfsd with unrelated exports. Repeating/cancel/retry uses persisted intended configuration and small per-resource receipts, not a generic workflow/journal platform.

### Selected managed Docker nodes

Host command controls **local** daemon. Daemon mounts NFS directly to a labeled local-driver volume; host mount is not copied/bind-translated as network storage. Descriptor carries daemon-reachable endpoint (Mac server via verified host-gateway/LAN address, not daemon localhost). `volume-nocopy`; verify exact driver/options/marker and actual node UID in a fresh probe before recreation. Private volumes, node-specific /home/autobyteus/workspace and old local-only shared folder unchanged.

Do not reuse launcher `start_node()` which pulls/reassigns/removes. SetupService Docker adapter:
1. Discover exact launcher labels/state (`com.autobyteus.launcher=server-docker`, nodeName); reject remote/unmanaged/ambiguous/custom unsupported configuration before stop. Never source user shell config as root.
2. Snapshot exact container/image ID, Config, HostConfig/mounts, ports, network aliases and running/restart state in0600 receipt. Plan adds only attachment volume/descriptor; existing settings preserved, no image pull.
3. Display selected interruption; require drain/operator consent; revalidate identities. Stop+rename old container retaining configuration and volumes. Create replacement at old name with immutable image/settings and new mounts. Container-name/IP changes are reported; preserve published ports/aliases and requested explicit network addresses where supported, reject conflicts.
4. Verify current application startup/shared admission and UID read/write. On success remove stopped old container **without volumes**. On pre-ready failure remove exact replacement and restore old container/name/state. If replacement might have accepted work, do not auto-rollback unknown writes; require new drain. Configuration rollback is never data rollback.
5. Save opted-in attachment reference only after apply. Launcher new/upgrade consumes that reference in desired config/hash and run_container, so later normal recreation cannot silently lose mount. Unselected nodes retain current behavior. Detach uses same preservation path with explicit selected disruption.

One host command configures its selected Docker nodes; every other computer still needs its own connect invocation/admin consent. Running a command inside an arbitrary unprivileged agent container cannot alter the Mac host; explain unsupported context before mutation, not promise impossible privilege. Product service container on Linux is created by the host flow, not manual docker-run assembly.

### SR021 — complete a selected client's NFS failed start (CR005 / API-F003)

**Boundary.** Normal machine/daemon startup remains Docker-owned for running
containers and their unchanged restart policies. SetupService now owns the
missing step from *verified shared storage* to completion of a selected client's
*failed pre-process NFS mount start*. This is not a generic container supervisor,
new desired-running catalog, process-crash retry, outage worker or first-use
recreation. It must work on the same selected ID; no image pull/rename/recreate,
policy/config/port/alias/auth/private-volume/source change is permitted.

**Primary path DS006:** ordinary host/daemon restart -> existing OS attachment
job -> serial administrative lock -> SetupService.Reconnect storage/host proof ->
Docker selected-failed-start completion -> same exact container Start -> existing
VerifyStarted API/shared-binding check -> truthful host/node status. Public
reconnect uses the same owner. First Apply still orders and verifies its initial
start, then commits selection; pending setup/recreation remains explicit-drain
recovery only. Status never issues Start. No `After=docker`/fixed delay is treated
as export readiness; no global Docker unit/config change, cycle or extra job.

**Selection and eligibility (all required, fail closed per node).**
1. Completed attachment, no pending setup or incomplete node recreation; bounded
   selected names from private `Attachment.Nodes`, current root-owned public
   `NodeAttachment` matches storageId/root/node and exact saved daemonID. Resolve
   each selected name to one current launcher-labeled container on that daemon,
   then use its immutable ID for ALL subsequent calls. Discover once per selected-set
   pass and match the bounded selected names; no repeated all-node scan per node. Current replacement after
   an ordinary launcher upgrade is resolved from selection/labels/mounts, NOT an
   old recreation receipt ID. No name-based Start or scan-and-start-all.
2. Snapshot passes existing supported-node qualification, exact attached NFS and
   read-only descriptor mounts. Read-only inspect of existing volume confirms
   owner label, local driver, exact device/export/protocol/options and daemon
   Mountpoint. Do not create missing volumes on recovery or read the daemon's
   Mountpoint through the host filesystem. Missing/mismatched resources stay
   incomplete, not repaired/replaced. Current immutable image is qualified by the
   existing image check; no saved image selection is silently re-applied.
3. Live state is `exited`, not running/paused/restarting/dead/removing/OOM, PID0,
   valid nonzero StartedAt and FinishedAt >= StartedAt. Current policy is
   `unless-stopped` or `always`; `no`, absent, `on-failure` or unknown is a veto.
   Exit255 alone is NOT evidence. The exact current `State.Error` must match the
   qualified local-driver **connection-refused mount failure for this exact NFS
   volume**, not arbitrary NFS text, another mount, app exit, permission denial,
   port conflict or a generic lifecycle error. Match the wrapper/volume Mountpoint,
   device/export and endpoint/options against the inspected volume; isolate
   qualified Docker grammar in the adapter. Unknown grammar remains unready and
   requires compatibility investigation, never a broad substring fallback.
4. The latest failed-start observation is unconsumed (below). Only now use the
   existing *fresh isolated image probe* with the same daemon volume/descriptor,
   no user/auth/private mounts or ports, to prove actual marker, mapping and
   read-write access. Host-ready alone cannot prove Docker Desktop's separate
   network/mount namespace. Probe cleanup follows its existing exact receipt.
   If probe fails/waits, no client Start; one outstanding serial check remains.
5. Reinspect exact daemon/container/volume after the awaited probe. Configuration,
   immutable image/ID, attached resources and failed state must still match the
   candidate; current policy must still permit recovery. Already-running is an
   observational no-op (verify, don't restart). Changed/stopped/unknown state or
   missing target cancels this candidate. No race-free arbitrary external Docker
   command transaction is claimed; no daemon-private state or event history is
   promoted to a lock. Public lifecycle actions are tested serially.
6. Persist the consumed failure identity **before** issuing one Start for the
   exact ID. Then use existing `VerifyStarted(id, root, shared=true)` and reread
   state. An already-running304 is accepted only after fresh exact-ID checks;
   ambiguous response/start error is not success and is not retried blindly.
   A newly running process is never stopped/recreated to repair a failed health
   check. Let Docker retain its process restart policy; report API/binding failure.

**Intent is live, not remembered at setup.** Successful Docker start clears its
startup error. Consequently an ordinary user stop of a running node, before reboot
or after recovery, has no qualifying NFS failed-start error and must stay stopped.
An initially stopped/never-started selected node also stays stopped. An
unselected node is never considered. `always` retains Docker's own different
boot behavior; do not emulate/change it. The current restart-policy veto is
rechecked immediately before Start. Initial `Old.State.Running`, a completed
recreation receipt and `Running=false` are expressly NOT recovery authority.

**Stop intent and the public-control limit.** Normal successful-running Stop,
before reboot or after recovery, is preserved and must remain stopped under its
current Docker policy. Do not use a setup receipt to infer that it should run.
Docker's `always` versus `unless-stopped` boot semantics remain unchanged.

Raw Docker Stop (including the existing launcher's forwarding call) on an
already-failed non-running container is a no-op: it records neither a new manual
stop flag nor an event. There is no safe public inspect inference that turns that
no-op into a durable veto. A private cancellation file alone is also insufficient:
Docker's own restore could still start the container on a subsequent boot before
this service. **Do not add that misleading cancellation mechanism or change
restart policies automatically.** Explain the narrow distinction in recovery
status and launcher/service documentation: for an outstanding failed start, the
existing explicit current-policy control `docker update --restart=no <node>` is
the durable veto; ordinary stop of a running node needs no extra action. Once
policy is disabled, service/reconnect must not override it. This is not an extra
setup command or a new blanket restart promise. The launcher should not print
an unconditional Stopped-as-cancellation promise for the failed-start case;
its existing Stop output can truthfully state that Docker stopping is not a
restart-policy change and link the pending-start guidance. No new privileged
Stop API, desired-running catalog or event-replay framework is warranted.

This limitation is inherited Docker behavior, made explicit rather than invented
as an inspect flag or silently promised away. It does not permit starting any
ordinary stopped node. Implementation/validation must prove serial normal Stop,
policy-disabled failed-start and unselected controls. Changed supported intent or
an inability to enforce those controls returns upstream, not a broader retry.

**Bounded local path DS006-L / attempt ownership.** Existing Supervise keeps its
serial cadence; readiness, not that interval, permits a Start. Docker adapter
owns classification/probe/reinspection/start/result; SetupService owns ordering,
selected refs and admin lock. Store one current private `start-attempt-<node>.json`
under the existing0700 state root, atomic0600, at most32 selected entries. Tight
record: daemonId, storageId, node, containerId, StartedAt, FinishedAt; it means
*automatic completion already attempted for this failed process incarnation*,
NOT desiredRunning, READY, credentials or a copy of Config. Current Error is
independently classified; exclude its string and mutable policy from the key so
an error/policy edit cannot repeatedly re-arm one failed incarnation. Successful
later process start changes StartedAt, so a subsequent normal reboot has a new
failure identity. No timer expiry/history growth. Malformed record suppresses
only that node's automated start with an actionable diagnostic.

The record is written before Start, so a service restart/ambiguous response does
not multiply requests. On resumed checking, a running exact target is verified;
a still-exited consumed failure is incomplete, never endlessly restarted. Public
**explicit reconnect** may authorize one further attempt for the still-eligible
same observation (existing action, no new mandatory CLI), after its normal action
confirmation/`--yes`; it must report this action rather than act like read-only
status. Background service cannot obtain that override. The current-policy veto is
always rechecked; reconnect cannot override policy=no. Preserve records across
ordinary supervisor/job restarts; safe detach removes only its selected-node
attempt records after attachment removal. A new exact container/process is not
held by an older record. No broader cancellation/force-unmount/outage guarantee.

**Interfaces and placement.** Extend `Snapshot.State` with actual public fields
Error/StartedAt/FinishedAt/Pid/ExitCode/OOMKilled (no invented manuallyStopped).
Use a dedicated typed observed failure/result in `internal/docker/start_recovery.go`,
not new global run-state fields. Adapter entry e.g.
`CompleteFailedStart(snapshot, connection, nodeAttachment, store, retryConsumed)`
owns live classification and action; returns disposition (`unchanged`,
`stopped`, `recovered`, `incomplete`) plus sanitized reason. SetupService's
`Reconnect` calls a cohesive `reconnect_nodes.go` selected-set coordinator after
host proof; keep ordinary CLI/service parsing thin. A read-only shared volume
inspection/validation routine is reused by EnsureVolume and this path; only
first-use EnsureVolume may create. Existing administrative lock serializes with
apply/detach; do not call background recreation Recover or launcher start_node.
Continue other selected independent nodes after a per-node failure, retaining
hostReady separately and returning aggregate incomplete; do not label intentional
stopped or failed node ready. `Status` uses current inspect/result/attempt reason,
never changes state. Keep opaque Config/HostConfig and network config preservation.

**Persisted-state decision.** Existing attachment/node refs/source marker/receipts
remain directly usable, no migration or new schema version. The new consumed
attempt is a distinct bounded current subject; absence truthfully means no
completion attempt recorded, not historical run intent. Existing unqualified
candidate fixtures are not released migration inputs. No project/runtime/history
rewrite or global application admission gate. Reuse existing config.Store and
atomic writer, not a second ledger/backup/task engine.

**Required validation, not claimed executed.** Add focused real-public-field
fixtures for exact recognized failure plus missing/foreign/malformed/normal-stop/
paused/restarting/dead/OOM/never-started/no/on-failure controls, changed current
policy/config after awaited probe, exact-ID calls, attempted-record semantics,
ambiguous Start/304/readiness failure and no repeated automatic Start. Reuse
HTTP Docker fixtures and setup lifecycle tests, with negative control disabling
this new owner (the old behavior must fail the relevant assertion). Then current
public create with selected running node and selected stopped control, unselected
stopped control, actual daemon-volume proof, **two ordinary whole-host reboots**
without manual Start/reconnect; assert same ID/image/Config/HostConfig/ports/aliases/
private volumes+bytes/source device/inode/owner/mode/bytes/UUID and real API/mounted
read-write. Ordinary stop while running -> service tick/reconnect/reboot stays
stopped; explicit policy=no after captured failed start -> no automatic Start
from service/reconnect. Demonstrate raw Stop no-op at this already-failed state
separately, and confirm truthful documented guidance, not a cancellation Pass.
Restore policy only through explicit test-owned operator action. Retain normal
node restart, launcher upgrade, safe detach and native-host/no-selected-node
regressions. Test both host OSes and server modes in the existing matrix; Linux
API-F003 first, not the entire future matrix before a design handoff. No fixed
150s requirement or forced outage suite. Advance confidence only from actual
current-build receipts; preserve API003/CRR008 failures until their owners replace
them. No claim this design is already implemented or the Docker no-op-stop observability limit solved.


## Application Binding And Normal File/Preview Use — SR018 Retained

Keep the normal filesystem path. Add a small lazy shared-binding reader/checker at server `workspaces/shared-workspace-binding.ts`: read the nonsecret attachment descriptor, classify configured root lexically, inspect OS mount/source and marker/access during **new shared-run preparation** and user-requested connection/status. No global startup enumeration, per-turn/per-file probe or bounded per-action child pool. The identity read may itself wait during outage; that limitation is explicit. Missing descriptor leaves existing ordinary local behavior; a known configured missing/wrong path is not replaced by temp/cwd. Keep WorkspaceManager/registry metadata-only and centralize the check in existing provisioning/runtime preparation used by standalone/Team/Org and restore, rather than duplicate storage policy. Existing service source/OS checks still own mounting, not the app.

Normal explorer, core file tools, terminal cwd resolution and native runtime launch keep their existing filesystem/PTY/process implementation. Shared mount behaves as an ordinary folder while online; current synchronous stat/realpath/chdir and parent streams are **not replaced for outage isolation in v1**. Keep ordinary denied-path, sandbox and explicit-cwd semantics. No shared-file-operation worker, SharedWorkspaceOperationOwner, response stream lease, new global filesystem access API or POSIX cwd trampoline. Existing process owners still must clean exact normal native sessions/private profiles correctly; this is normal resource correctness, not the deferred outage expansion.

### Existing previews are preserved, not reimplemented

- FileItem -> fileExplorerContentActions -> workspace content URL -> `api/rest/workspaces.ts` content handler. HtmlPreviewer uses its static sibling for HTML and relative assets. Existing workspace lookup/getAbsolutePath is metadata/lexical; existing parent existsSync/statSync/createReadStream serves the mounted bytes.
- Completed ArtifactContentViewer -> `/runs/:runId/file-change-content` -> RunFileChangeProjectionService.resolveEntry -> parent file check/stream. Existing projection supports tracked absolute paths as well as workspace-relative entries; no new confinement or workspace-registration requirement. Active pending/streaming write_file buffered UI stays unchanged.
- Retain global remote-access hooks, workspace path400, absent workspace/entry404, pending-no-file409, historical/no-file404, MIME including SVG/PNG and artifact no-store. Continue ordinary streaming rather than buffering entire files or copying to a local mirror. No new binary/stream protocol, range/cache/error policy or route source change is required solely for D-001. Current healthy-path tests below must actually verify these previews; if they reveal a normal-operation defect, fix/review it within scope, not dismiss it as an outage.
- During storage/network loss, these handlers may block other work in the process; partial responses/cancellation/recovery have no new guarantees. D-001 is **deferred by user direction, not technically repaired**. Its proposed stream/child ownership expansion is a follow-up, not an implementation gate. No API/GUI is allowed to advertise bounded outage behavior that was removed.

### Narrow normal Git/runtime integration

All CLI runtime working directories remain the actual project. Retain SDK/ACP cwd and existing process owners, no new spawn isolation. Scoped Git trust described above is **child environment only**: verified selected project -> append exact safe.directory entry while preserving existing GIT_CONFIG_* indices -> runtime or managed terminal child environment. Add a small runtime helper and, only where needed, optional per-session environment input to existing core terminal start/bridge APIs. Do not set process-global trust or refactor terminal physical-cwd resolution for outage handling. Other absolute cwd/local projects preserve existing behavior. Git remains a compatibility test, not mandatory folder format or setup prerequisite.

## Configured Skills And Runtime Lifecycle — SR019 / IMP-D001

**Decision: private links with current source-availability limits.** New server `RuntimeSkillProfile` is a node-private exposure directory per execution generation, not a snapshot of catalog bytes. Its generated manifest/wrapper files and directory symlinks belong to that execution; linked skill folders/support files belong to their existing source owner. `executionGeneration`/`profileId` identify runtime preparation, NOT a managed source generation or retention token. FR011 requires peer-stop isolation of profile/link cleanup, not pinning source bytes. Choose this smallest form rather than complete source copies or a new source-lease/refcount/retirement subsystem. Neither copy nor lease is an implementation fallback.

### Selection and independent lifetimes

1. Existing `SkillService.resolveSkillScope`, configured bindings and collision policy remain authority. For a managed binding, preparation calls `resolveManagedSkillForMaterialization(sourceId, exactName)` to obtain the **current matching catalog winner**; it is a lookup, not an acquire/release API. Do not trust a stale generation path as current merely because it appears in a binding. Local-source selection retains current catalog precedence. Existing project-owned collision inspection remains on the healthy filesystem path; `CONFIGURED` collisions fail, `ALL_INSTALLED` prefers the project entry. No new source scanning/startup gate or shared-workspace write.
2. Create an exact owned private profile and record its cleanup receipt before awaited staging/native preparation. Write only generated skills-only plugin/manifest/name mapping, then create directory symlinks to selected validated skill folders (including support assets through those links). Do not copy repository bytes, credentials, hooks or arbitrary MCP config. Use safe names and existing source/manifest checks. Keep existing runtime-specific unresolved/unavailable-source warnings/errors; do not silently skip an available configured skill to make sharing pass. Source identity/path is an observation, not a guaranteed live lease. No transactional guarantee against simultaneous Update/Remove is added.
3. `RuntimeSkillProfile` owns only its wrapper files/links and profile lifetime. Existing exact SDK/process/client owner holds that profile through preparation/spawn/active use and releases it only after actual close, or after failed preparation proves no native owner remains. Timeout/rejected asynchronous close is not release proof. Cleanup unlinks/removes only this exact owned profile without following links into sources; it never calls source cleanup, deletes a catalog tree or removes another execution's profile. Two nodes may link the same available source; closing A must not damage B's profile or source.
4. **SkillSourceService / GitHubSkillRepository remain independent source-byte authorities.** Confirmed changed-revision Update publishes the current generation and cleans retired generations; Remove retires/deletes source bytes. They neither wait for nor enumerate profile holders. No new callback/refcount/retention registry, operation lock spanning a runtime, altered UI confirmation or delayed source cleanup. Local-folder unregister retains its current non-deletion semantics. A private link can become dangling after source Update/Remove; runtime discovery/cache behavior does not create a snapshot or continued-availability guarantee. No live profile retarget/prompt refresh is promised.
5. A new Claude/Codex/Grok execution or reconstructed profile resolves current configured sources through the same owner/policy; never recover an old path by reactivating a retired source or copying a previous node's private profile. Existing native session IDs/resume mechanisms stay. AGY is a distinct existing capsule lifetime below: its restore does **not** become this new re-resolution flow. Restoring a runtime is not a guarantee that removed skill bytes reappear.

### Runtime exposure / unchanged source policy

| Runtime | Private exposure and selection | Process/restore contract |
| --- | --- | --- |
| Claude | SDK local plugin points at generated skills-only plugin whose skill entries link to current catalog folders. Plugin name `autobyteus-configured`; logical-to-discovered namespace/path mapping retained; Skill/MCP/sandbox policy unchanged | Bootstrap/query options carry private plugin path. Existing preparation guard/ClaudeSdkProcessOwner holds profile only. Resume rebuilds current profile, passes plugin with same native session ID. FR014 proves private-plugin/peer-stop/resume with **copied fixture skills**, not linked-source lifetime; production link discovery/assets require validation |
| Codex | `skills/extraRoots/set {extraRoots:[private parent]}` before skills/list/thread; use actually discovered names/manifest paths, allowing native canonical source paths rather than assuming lexical link path equality | Compound client key `{cwd,profileId}`, real cwd unchanged; profile layout not mutated across threads. Existing exact client lease releases process then profile. Source content is not immutable/pinned. FR020 proves private roots/replacement resume with **copied fixtures**, not symlink or source-retention proof |
| Grok | Literal `agent --plugin-dir <private skills-only plugin>` with linked selected skills; validate ACP discovered names/paths; no GROK_HOME/auth move | Existing ACP owner holds profile before spawn until observed exit; cwd/session semantics unchanged. FR057 proves plugin discovery only; linked assets/native turns remain downstream validation |
| Antigravity | **Reuse unchanged** private capsule `.agents/skills` directory links, manifest and existing owner. `linkAgyConfiguredSkills` has no source lease; preserve configured/unresolved/unusable and workspace-collision policy | `restoreAgyRunCapsule` preserves its identity manifest, checks linked SKILL.md, removes only dangling private link and warns/skips missing source. Do not rebuild/re-resolve this capsule from a different catalog generation or add leases/snapshots/schema solely for sharing |
| AutoByteus native | Existing configured-skill prompt/catalog path remains; core tools use normal mounted project IO | No new plugin/profile or source-byte hold; no shared project link introduced |

Supported capabilities stay version-evidenced. Incompatible private-link discovery is a concrete normal-use finding for Solution Designer, not permission to silently disable skills, publish links to the common project, copy sources or add a retention service. Project-owned `.claude/.codex/.grok/.agents` skills remain ordinary project data; no scan/delete/migration of ambiguous existing links. Private profiles on each node are generated from that node's current configured sources, not private-path copies from a peer.

**Preserved limitation vs defect:** peer stop may remove only the peer's profile and must not destroy another active profile (FR011 fix). A separate user-confirmed source Update/Remove can retire linked bytes, just as the current skills source contract allows; that is not peer-stop damage. Document this distinction. The former is mandatory normal correctness, the latter does not authorize a new snapshot/retained-generation product guarantee.

## Nodes NFS Guide

Extend existing NodeManagerTabs/NodeManager union, route-query selection and panel with `nfsGuide` beside `dockerGuide`. Add NfsGuideCard.vue and pure nfsLauncherCommands.ts release descriptor, localized en/zh-CN content and copy/unavailable/failure feedback. Reuse responsive/accessibility card pattern from screenshot, preserve current node selection and all old tabs. Display one complete first-use install-and-start invocation, create/connect distinction, intended **computer** and resulting workspace path. No Windows card, mount-dashboard or browser execution. Missing compatible published release disables working-command copy and explains availability; test fixtures are not public availability evidence. Standalone service remains obtainable without app.

## Off-Spine Boundaries, Interfaces And Dependency Rules

| Public boundary / accepted subject | Encapsulates | Callers / forbidden bypass |
| --- | --- | --- |
| SetupService.plan/apply(plan receipt, consent) | Selected source, OS jobs, exact resource revalidation and apply result | CLI only; no renderer privileged changes, no shell-evaluated connection metadata |
| HostedFilesystem + ClientAttachment config | Intended source vs expected local mount | Supervisor/installer; no READY persisted or workspaceId used as storage authorization |
| SharedWorkspaceBinding.checkForRun(expected path) | Lazy descriptor, mount/source/identity check during new-run setup | new-run/restore boundaries; no global startup or per-action outage promise |
| RuntimeSkillProfile.acquire(scope, runtime, executionGeneration) | Owned private wrapper/link directory, discovered-name map and profile cleanup receipt; current source lookup is not a lease | Existing runtime bootstrap/close owner; no source-byte acquisition/deletion, shared publisher or cwd-only Codex pooling |
| Existing SkillService.resolveManagedSkillForMaterialization(sourceId, name); SkillSourceService Update/Remove | Current matching catalog lookup; separate source publication/retirement/deletion | Profiles read current selection only; no retention callback, source release token or new source lifecycle |
| Docker selected failed-start completion / DS006 | Current selected ref + exact daemon/container/volume + typed failed-start observation -> one attempted Start/real verify | SetupService only after storage proof under existing lock; read-only status, no active-process restart owner, no receipt-derived intent |
| DockerNodeAttachment.apply(exact container plan) | Preservation/recreation/rollback receipt and daemon NFS mount | Setup owner; no start_node/pull/volume-delete shortcut |
| NFS guide descriptor | Supported release/download/command text | Vue display/clipboard only; no fake URL or execution |

Singular responsibilities and explicit identity shapes: all above Yes; ambiguous-selector risk low after separating storageId, workspaceId, containerId and executionGeneration. Shared structures: `SharedMountBinding` has storageId/root/endpoint/export/protocol (no duplicated ready); `MountObservation` records current known ready/missing/wrong/checking/error, not durable readiness or an IO deadline; `RuntimeSkillExposure` maps logical name to discovered native name/path; its observed source path/provenance is not a retention token; `DockerApplyReceipt` is private exact old/new resource state, not a second launcher catalog. Types stay with owning capability, not a generic utils bag. Config implementation language differs, so JSON contract fixtures are shared, not a generated cross-language framework.

Reuse/extend: workspace registry, skill catalog/collision policy, runtime exact owners, existing PTY bridge and explorer algorithms, atomic current config conventions, launcher and Nodes guide pattern. New capability only for missing OS service/attachment administration, a small server binding checker and private exposure. Core never imports server; normal tools/readers remain ordinary filesystem clients. Administrative Go state isn't the runtime process owner; TypeScript never mutates export/jobs. No shared global provider state, unnecessary startup dependency, engine I/O through app API or root-owned job reading user shell executable state.

## Persisted Data / State Transition Decision

Migration conventions fully investigated before choice: server data_migration_guideline; remove-global-skill-discovery-mode predecessor demonstrates per-file backup/SKIPPED/FAILED, not authority for arbitrary startup migrations here.

| Stored subject / representative shape | Decision / why | Reader/writer, privacy and restart constraints |
| --- | --- | --- |
| Existing workspace registry workspaceId -> rootPath, volume proportional to registered workspaces | **Directly Usable — No Migration**; path meaning/ID unchanged | Existing known-field registry owner; separate attachment, no path rewrite or project move |
| Existing run/session references/native session IDs plus AgentDefinition skillNames/skillScope | **Directly Usable — No Migration**; no persistent field change | Claude/Codex/Grok rebuild current private exposure from existing scope; AGY retains its existing capsule restore below. No persisted plugin path becomes a source-retention authority |
| New Claude/Codex/Grok private profile per execution generation, not source history | **Discard or Rebuild** only under exact profile/process owner | Current catalog lookup reconstructs wrappers/links; no source snapshots/retention or stored-generation migration. Uncertain live profile is not deleted |
| Existing managed-source registry/generation trees and AGY capsule manifest | **Directly Usable — No Migration** | Source Update/Remove cleanup and AGY warn/skip missing-source restore unchanged; no profile holder field/source lease/schema addition |
| Hosted source identity (one per installation) | **SR023 explicit transition**: current Mac UUID+inode and Linux device+inode directly usable; old bound Mac device-only test state not convertible | Atomic private owner; no schemaVersion/fallback/rebind. Matching-old-candidate drained detach before fresh current fixture create; preserve source/marker. Unknown supported deployment -> return evidence |
| Pending hosted identity | **Bound-once intent**; current complete identity reused, truly zero NewSource intent may establish its first binding | No stale-flag recapture; malformed/old-bound or hosted/unbound inconsistency refuses. Save bound intent before later source/apply effects |
| Attachment/public descriptor and source marker | **Directly usable — no migration** | Format/UUID/meaning unchanged; no source or recovery-state deletion |
| Existing launcher state plus optional attachment reference | **Directly Usable — No Migration** | Missing reference retains unselected local behavior; known-field parser/writer preserves all existing settings. Only successfully applied nodes acquire opt-in reference |
| New start-attempt per selected node | **New bounded subject — no migration**; absent means no recorded completion attempt, not prior running intent | Docker recovery writes current daemon/storage/container/process incarnation through existing atomic0600 Store; no Config/auth/READY, restart-safe dedup only. Detach removes exact owned entries after success |
| Generated owned Ganesha config | **Fresh current generation; no evidenced released predecessor migration** | SR022 export expiry0; exact current bytes reusable, different bytes retained/refused. Retire disposable old test setups with matching candidate public detach before reinstall. Status/pre-teardown validation avoids false readiness/partial mutation; no live reload or source/marker rewrite |
| Release engine manifest and generated embedded package bytes | **Build artifact — no user-data migration** | Packaging owns exact bytes/provenance; no source UUID/profile/attachment format changes or runtime package registry |
| Existing project absolute skill links | **Preserve; no automatic migration/cleanup** | No durable cross-node ownership proof, so don't delete/repair others' data. New managed-shared flow never creates them; collision result is explicit |

No new data-loss permission beyond disposable fixtures/rebuildable exact-owned generated profiles after profile release. Existing separately user-confirmed Skills source Update/Remove retains its already-defined deletion authority; NFS setup/profile cleanup never invokes it. No migration ledger/backups needed for untouched formats; normal new config apply retains narrowly scoped rollback receipts. External project backup/recovery is operator duty, not replication. Rollout: upgrade participating application/launcher to shared-capable build before selecting managed workspaces; refuse incompatible node integration before disruption. Old independent unmanaged applications are not silently reconfigured.

## Legacy Removal And Compatibility Rejection

| Item | Disposition / replacement | Scope |
| --- | --- | --- |
| Configured shared-path temp/cwd fallback | Remove; shared binding/new-run error retains intended path | In this change |
| Shared-project configured skill publisher | Replace with private exposure; no dual publisher/profile fallback | In this change; healthy local workspace branch stays supported |
| SR018 proposed source-generation lease/pinned-byte reuse | Withdraw false design premise; current-source private links only | Design-only correction, no source-retention code exists to remove or implement |
| Shared parent physical checks/REST streams/Claude chdir/PTY spawn cwd | Retain existing healthy path; outage-specific child/stream/trampoline changes deferred by DEC015 | Preserved normal behavior; disclosed outage follow-up |
| General launcher recreation for attachment | Not reused; exact preserved Docker apply | In this change |
| Existing local-only /home/autobyteus/shared | Keep independent documented functionality, never presented as cross-machine storage | Preserved behavior, not legacy compatibility |
| UNFS patch prototypes | Evidence only; do not move into production backend | Rejected candidate |
| Host-only Reconnect completion boundary | Extend to eligible selected-client failed-start completion after host proof; eliminate duplicated volume validation via one read-only validator | SR021; do not remove Docker restart policy, initial recreation or explicit-drain Recover |
| Mac durable raw-device equality / complete pending recapture | Replace with APFS UUID+inode binding and bind-once pending lifecycle; no legacy acceptance branch | SR023 only; Linux equality, marker/nonroot checks and existing lifecycle retained |
| Stock Ubuntu Ganesha4.3 engine install path/pins | Replace with exact upstream-corrected package bundle for native/Docker storage; no parallel stock fallback | SR020; nfs-common/distro dependency path preserved |

No dead source is claimed without reachability proof. Remove newly unreachable shared-specific helpers/imports/tests in touched files once cutover is complete; do not broad-clean unrelated package. Reject path-only READY, local-copy fallback, global safe.directory, shared auth homes, compatibility schema readers, dual shared skill publishing and timeout-as-release. Unchanged local branch is a separate preserved behavior, not a fallback for failed shared execution.

## Final Subsystem / File Responsibility Map

This is the finalized allocation after spine/ownership/type review; redundant draft mapping omitted. Paths relative to worktree; braces denote cohesive files, not new runtime layers for each name. Existing exact file names stay unless a narrow extraction is needed.

| Path / create or extend | Owner and one concern | Boundary / must not contain |
| --- | --- | --- |
| autobyteus-nfs/go.mod; cmd/autobyteus-nfs/main.go | Build module and thin invocation | No storage state in entry |
| autobyteus-nfs/internal/setup/{plan,apply}.go | Selected-resource plan, consent and apply sequencing | No general workflow engine |
| autobyteus-nfs/internal/config/{state,connection,store}.go | Tight subject records/atomic private storage | No workspace DB migration/READY cache |
| autobyteus-nfs/internal/service/{supervisor,probe}.go | Persistent owned lifecycle/exact child check | No second engine data plane |
| autobyteus-nfs/internal/platform/{darwin,linux}.go | Elevation, mount inspection, launchd/systemd/exact export ownership | No unbounded shell interpolation/global reset |
| autobyteus-nfs/internal/platform/{source,source_darwin,source_linux}.go; config/{state,source_identity}.go; setup/{plan,apply,pending,lifecycle}.go; adjacent tests; NFS README | SR023 source observation/variant validation and bind-once lifecycle in existing owners; source_identity extraction optional | No raw-device Mac fallback, marker-only binding, identity migration, generic supervisor or backend/data-plane change |
| autobyteus-nfs/internal/backend/ganesha.go; internal/setup/{status,lifecycle}.go; nearest backend/setup tests; NFS README | SR022 export-level expiry0 through shared generator; read-only hosted-config status and pre-teardown exact validation | Reuse existing verifier/lock; no migration or runtime data-plane owner; Apple/connect-only and SR021 recovery unchanged |
| autobyteus-nfs/internal/backend/{apple,apple_apply,apple_startup,ganesha,ganesha_native}.go; packaging/Dockerfile | Existing selected engine config/start; Docker consumes same corrected package pair | Preserve Apple IR004 fix and existing privilege/source contracts; no UNFS/macDocker storage fallback |
| autobyteus-nfs/internal/backend/ubuntu_packages.go; engine_bundle.go plus generated engine-assets/ | Existing install owner + cohesive immutable package payload validation/extraction | No user-supplied package/URL, stock-engine fallback, kernel tuning or reconnect install |
| autobyteus-nfs/packaging/engine/{source-lock.json,build recipe,upstream patch}; packaging/{release-lock.json,release.py,RELEASE.md}; THIRD_PARTY_NOTICES | Verified backport sources/build/package identities and corresponding-source delivery | No source-state migration, PPA, independent release stream or invented qualification |
| autobyteus-nfs/internal/setup/service.go; setup/apply.go; cli/verify-release.go | Carry engine manifest through existing typed release/apply validation | No duplicate package installation owner or source/marker reader relaxation |
| autobyteus-nfs/internal/setup/{lifecycle,reconnect_nodes,status}.go; cli/run.go | Sequence selected-client completion; explicit reconnect retry authority separate from background checks; report current state | No Start from status, no pending-recreation bypass |
| autobyteus-nfs/internal/docker/{start_recovery,start_attempt}.go (add); snapshot.go; attachment.go (modify) | Qualified public failure classification, exact volume inspection, probe/reinspect/one Start; bounded attempted incarnation | No desired-running catalog, private daemon DB/event replay, arbitrary-error or all-stopped retries. Existing recreate/recovery/exec retained |
| autobyteus-nfs/internal/docker/{client,ownership,attachment,recreate}.go | Local daemon and exact node preservation | No provider credentials in logs/general container manager |
| scripts/public/nfs/install.sh; .github/workflows/release-nfs.yml; RELEASE.md | One install/start and existing-tag asset production/docs | No release outside guide/user authority |
| scripts/public/docker/autobyteus-docker.d/bash/{core,docker-runtime,commands,nfs-attachment}.sh and focused tests | Preserve attachment reference; truthful stop-versus-restart-policy guidance, no operational Stop change | No NFS retry/intent policy in shell, root sourcing of user config or Windows promise |
| autobyteus-ts/src/tools/terminal/{types,isolated-pty-session,isolated-pty-bridge-source}.ts and callers only as needed | Optional per-session child environment for exact-project Git trust | No broad file/cwd/PTY outage-isolation refactor; preserve public cwd behavior |
| autobyteus-server-ts/src/workspaces/shared-workspace-binding.ts (new); existing provisioning/restore callers | Lazy descriptor and expected storage check for requested new shared run | Registry/metadata startup unchanged, no per-action worker or mount administration |
| server src/agent-execution/services/{agent-run-provisioning-service,standalone-agent-run-lifecycle-service}.ts; team/org run-service and configured-agent-execution-handle.ts | Existing new-run/restore preparation checks binding once per execution generation through workspace/runtime boundary; active turns reuse that runtime | No duplicated mount policy per Team/Org |
| server src/agent-execution/backends/shared/{runtime-skill-profile,runtime-skill-exposure}.ts (new); existing workspace-skill-collision-policy | Private wrapper/link profile and exact cleanup receipt; current-source lookup/native-name mapping | No source leases, repository copies/retention, second catalog or shared project link registry |
| server src/agent-execution/backends/{claude,codex}/backend/*bootstrapper.ts; session query/options and workspace resolvers/materializers | Shared branch private exposure/native name map, no cwd fallback | Ordinary local publisher/policies unchanged |
| server src/runtime-management/claude/client/{claude-sdk-client,claude-sdk-process-owner}.ts; codex client manager; shared/scoped-project-git-environment.ts (new) | Existing process/lease ownership, compound Codex profile identity and exact-project child environment | No second PID authority, new cwd trampoline, global safe.directory or parent IO rewrite |
| server src/runtime-management/grok/grok-build-launch-profile.ts; acp/{acp-agent-launch-profile,acp-agent-process}.ts; backends/acp/backend/acp-agent-run-backend-factory.ts | Per-process skills-only plugin before spawn and actual-close release | No GROK_HOME/auth relocation |
| server src/agent-execution/backends/antigravity/capsule/{agy-run-capsule,agy-configured-skill-linker}.ts (preserved) | Existing private links/capsule identity and missing-source restore | No source lease, rebuild-to-current-generation change, snapshot, schema/migration or outage worker |
| server src/skills/services/{skill-service,skill-source-service}.ts; skills/installers/github-skill-repository.ts (preserved); docs/modules/skills.md (document private exposure) | Existing catalog lookup and source-byte publication/deletion authority | Do not change source cleanup/serialization/Update/Remove; no runtime refcount or retained generation |
| autobyteus-web/components/settings/{NodeManagerTabs,NodeManager,NfsGuideCard}.vue; utils/nfsLauncherCommands.ts; localization/messages/{en,zh-CN}/settings.ts | Narrow guide navigation/copy/release descriptor | No live service controller/Windows support |
| server src/api/rest/{workspaces,run-file-changes}.ts; web fileExplorerContentActions/HtmlPreviewer/ArtifactContentViewer (preserved) | Existing healthy mounted file/static/artifact return paths | No outage worker/source rewrite solely for D-001; normal source fixes only if current-build coverage finds a defect |
| Package-local tests and autobyteus-nfs/README.md; affected server/web docs | Durable acceptance coverage and accurate operational contract | No historical prototype represented as product signoff |

Folder check: service transport, setup control, config persistence, platform/backend/Docker adapters remain distinct; server shared binding is identity configuration (not app admin); server profiles stay runtime-owned; Vue guide stays interaction-only. Low layering ambiguity after explicit core->server dependency prohibition. No redundant independent storage identity fields, parallel profile catalogs or one-file-per-abstract-layer hierarchy. Applied patterns are existing exact process/profile lifecycle leases, private current-schema config and platform adapters, not a plugin framework.

Concrete shape example: container `/Volumes/autobyteus-shared/project` -> daemon's NFS volume -> same storageId/source as Mac mount; **not** mkdir same path on two computers. Process preparation -> profile lease -> spawn -> observed close -> release; **not** Promise.race timeout -> delete live profile. JSON join metadata -> bounded parser -> typed plan; **not** pasted `eval` shell.

## Change Sequence, Validation And Implementation Guidance

**Current recovery delta SR023:** after configured architecture review implement only Mac persistent volume+directory identity, strict backend-specific binding and existing hosted/pending lifecycle wiring/tests/docs. Retain IR002–008 and exact IR005 engine bytes; regenerate current CLI/source metadata without engine rebuild. Independent selected source review -> **API-F005 current public nativeMac create / ordinary whole-host boots / automatic nonroot mounted read-write FIRST**, then separately public reconnect and supported replacement refusal. No synthetic device edit, manual identity rewrite or probe substituted for product validation. Preserve CR005/API-F003 and CR006/API-F004 scoped API005 resolutions with proportionate regressions. CRR012 Fail/API005 Fail remain until independently replaced. The numbered sequence below is original overall context, not a request to redo implemented work.

1. Implement service config/plan/current state + backend/source qualification + packaged bootstrap on isolated resources, and pure contract fixtures. Current architecture-review gate precedes production implementation. No live data/export/mount/node change without explicit operation approval.
2. Implement native supervisors/mount probes, selected Docker preservation and repeat/detach; integrate launcher opt-in reference. No installer success before same-source and execution-UID verification. Keep unsupported combinations explicit.
3. Add the small server shared-binding check at existing new-run/restore preparation and remove intentional shared temp/cwd fallback. Preserve metadata-only startup, normal file/terminal/preview paths and scoped child Git environment. Do not implement deferred outage-specific workers, per-action checks or cwd trampoline.
4. Add private linked runtime profiles with exact process/profile cleanup receipts (NOT source leases), current-source lookup, capability/name mapping and existing restore policy. Cut shared publisher and cwd-only profile pooling paths, retain project-owned skills/collision semantics. Preserve source Update/Remove and AGY missing-source restore, no snapshot/copy fallback. Confirm denied-path/sandbox policies and native linked-skill discovery/assets; peer-stop profile cleanup remains mandatory.
5. Add narrow Nodes guide and pure release descriptor. Before publication, unavailable state is truthful; test command/download linkage against actual built/released assets, not invented URLs.
6. Implementation self-checks -> configured independent review -> API/E2E realistic system checks -> Delivery docs, real physical scenario, merge, explicit user verification, authorized release/cleanup. No downstream artifact or pass is manufactured by Solution Designer.

Validation obligations: pure plan/config/descriptor/parser tests; Go/native clean-machine bootstrap; normal necessary OS/disruption consent and denial; healthy mount/source/UID identity and known-config guard checks; no intentional local substitute; normal file operations/exclusive-create/locks/relative symlink/execute/coordinated Git/concurrent different files/<=5s binary visibility; selected Docker image/ports/private volume preservation; healthy repeat/restart sameUUID and safe detach/source preservation; current-build workspace selection/explorer reload and **healthy media/static/completed-artifact previews**; actual native Codex/Claude reciprocal instructions including normal peer-stop/restore private skills; proportional Grok/Antigravity/core compatibility; accessible guide copy/failure/unavailable/navigation and actual release linkage.

For IMP-D001 correction, reuse existing server tests/e2e/skills/github-skill-sources-graphql.e2e.test.ts for confirmed Update/Remove through public GraphQL (the inspected runtime matrix is not a new pass), shared workspace-skill-materializer unit tests for unchanged local policy and tests/unit/agent-execution/backends/antigravity/{agy-configured-skill-linker,agy-run-capsule}.test.ts plus tests/e2e/runtime/agy-linked-skills-transport.e2e.test.ts for existing capsule semantics. Add focused profile tests: private links expose SKILL.md and a previously unread support asset; two distinct profiles share available source, closing either preserves the other/source; partial preparation/actual native close releases only owned wrappers; Update removes retired source while a profile exists, next profile selects current source, Remove does not wait for holders and missing-source handling stays explicit. Do not test a fabricated old-generation retention guarantee. Current native private-link discovery and real tool reads/peer-stop are downstream obligations; earlier copied-fixture FR014/020 do not prove that link-specific integration. No new GitHub network/auth/provider use needed for owner-level tests.

For healthy preview coverage extend/reuse existing tests/unit/api/rest/{workspaces,run-file-changes}.test.ts, tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts and tests/integration/api/run-file-changes-api.integration.test.ts. Verify exact PNG/SVG bytes/MIME/no-store, HTML plus relative assets, encoded paths, existing path/entry/pending/deleted semantics and regular local use; actual shared mounts/current UI must supplement fixtures. No source change is required to stream a healthy ordinary mounted file unless tests find a real normal-use incompatibility. Do **not** make D-001 injected outage/socket-cancellation/backpressure child-isolation matrix,10s diagnostics, global parent-responsiveness or additional recovery tests a v1 delivery gate. Retain prior outage experiments as evidence and disclose limitations, not as a requirement to build their prototypes.

SR023 API-F005-first ordering supersedes historical API-F002/API-F003/API-F004 first-case orders for this incoming correction; prior scoped resolutions remain regression evidence, not reopened failures.

Table every experiment with **node role/ID, source/mount path, exact command/build, result and uncovered scope**.
Follow TESTING.md production public path requirements, isolated data/resource authorization and package test commands. Unit mocks do not prove NFS/native/OS behavior. No direct controller shortcuts for full user journey; no shell transport probe substituted for instructed native agents. Physical Mac and independent Linux plus Mac Docker agent, actual one-command create/connect and user verification are release/delivery gates, not designer waits. User receives the runnable single command only once built/published and verified; internal python/mount test scripts are never offered as that product command.

Tradeoffs/risks: qualified Docker diagnostic grammar/public-state observability (Docker no-op stop of an already failed start has no intent event, including launcher forwarding; current restart-policy veto is explicit); the one-start consumed record may require explicit reconnect after ambiguous/interrupted completion, never false success; backport/source-distribution maintenance, fresh native Ubuntu public installer proof at API003 scope but amd64/published bootstrap/complete parity still unqualified; two mature OS backends, not one portable but faulty engine; private LAN plaintext/coarse trust rather than security-platform scope; Linux v4 locks vs Mac v3 documented local-only advisory locks; chosen source may have incompatible ownership/case/OSprivacy; hard mounts can retain blocked IO and stall parent previews/file/terminal or unrelated local work; v1 intentionally does not isolate that; exact Docker recreation needs downtime and configuration qualification; native runtime APIs/link discovery may change and linked skill bytes may disappear after confirmed source Update/Remove (no source retention); independently physical hardware/release credentials still not supplied here. Normal-use contracts are implementation/validation obligations; advanced outage machinery is an explicit follow-up, not an unresolved product-choice question or hidden release blocker. If evidence disproves selected mechanism, return findings for solution revision instead of silently narrowing scope.
