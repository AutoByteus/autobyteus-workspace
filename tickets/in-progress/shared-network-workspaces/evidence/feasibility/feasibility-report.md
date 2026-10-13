# Latest Executed Evidence — SR-010 (Approved Intent SR-009)

Native Mac test VM automatically operated, no user commands/host admin. FR-02611 checks/four real native agent turns across Mac+two Linux Docker nodes pass on same `/Volumes/autobyteus-shared/project`; native cwd/tool output and independent mounted/backing bytes/hash agree. See macos-vm-feasibility-report.md and mac-three-node-agent-proof.json. FR-023–025 actual provisioning failures retained. Not physical LAN/current source/rendered UI/final user command/delivery.

Native Codex private lifecycle FR-02011 passes; bounded Linux readiness FR-0189 passes, earlier failures/caches/capacity retained. See native-private-readiness-report.md. All exact owned Docker resources absent; credential-bearing VM clones deleted, public baseline cache retained. No production or live user changes. Requirements Approved SR-009 unchanged; design/setup/physical-LAN and downstream gates incomplete. Internal probes are not the finished user command.

---

# Current SR-009 Update

Service-host direction is now Linux (Docker eligible), approval-record-sr009.md. [Private runtime skill report](private-runtime-skill-report.md) records three additional rounds: FR-012/013 retained failures, FR-01412 scoped native-SDK capability passes including peer cleanup/resume. No production fix, Mac/LAN/source/UI/setup proof or completion. Approved basis/current evidence SR-009; historical SR-008/component results below remain unchanged.

# Feasibility Experiments — SR-008

## Result And Scope

**Local storage/application/native-agent core works; overall feasibility/design incomplete.** FR-006 has14 component passes plus watcher observation/Mac blocked; FR-007 eight scoped application-image passes. FR-009 now demonstrates four actual Codex/Claude cross/same-runtime agent pairs and16 native write/read/modify/reopen stages, but exits1 after a peer-stop shared skill read fails. FR-011 reproduces the ownership gap three times and exits2. No real separate computer, native Mac mount, rendered UI, source-build or one-command setup proof. All Linux clients/nodes were in this Mac's Docker Desktop VM. Do not sum check counts and call full requirements validated.

Approved requirements intent: SR-004, approval-record-sr004.md; current evidence revision SR-008. Product implementation/design-complete routing is still behind REQ-016/AC-016. Current detailed actual-agent evidence: [real-agent-roundtrip-report.md](real-agent-roundtrip-report.md), native-agent-proof-audit.json and FR-008–011 receipts. Earlier sections below retain the component history and actual limits.

## Environment And Candidate

- Mac26.5.2 arm64, uid501; Docker Desktop context desktop-linux, local Unix socket, client/server29.0.1; Linux VM kernel6.12.54-linuxkit.
- Task-built official Ubuntu24.04 base resolved to sha256:534baea6a22c03a63003dbc8dbe78fe34bc0d7e595d9a9dc9834884ff530eb55; NFS-Ganesha4.3 (4.3-8ubuntu1), nfs-common1:2.6.4-3ubuntu5.1. Exact build output in fr-001/image-build.log. Not a selected production version.
- Candidate: Ganesha/VFS service exporting a private task-owned Docker data volume; NFSv4.1 native Linux client; Docker local-driver NFS volumes at /Volumes/autobyteus-shared for nodes A/B. No Mac host-file bridge or FUSE involved in these Docker client mounts.
- A/B had UID/GID10001 and CapEff=0; setup was done by the Docker daemon, not mount commands in those clients. Native Linux client C had SYS_ADMIN only for this owned mount experiment. Server had DAC_READ_SEARCH for VFS file handles.
- Prototype permissions: export default None, explicit client allowlist and All_Squash to dedicated UID/GID10001, data directory0770; sec=sys. This is evidence of coarse trusted-host sharing only, not selected production user authentication/tenant isolation. Kerberos/keytab warnings retained; no Kerberos/TLS claim.
- Published server port bound only to127.0.0.1. No LAN/public exposure or user Docker-node recreation.

## What Worked In FR-006

- Two unprivileged Docker clients opened the same NFS export at the same ordinary path, without configuring/mounting the filesystem inside their containers.
- Completed text write A -> read/modify B -> read A; one-MiB binary exact equality/hash.
- Direct native Linux NFS mount C read/modified the same files, observed by A.
- mkdir, atomic-rename/replace operation, relative symlinks, exclusive-create rejection and chmod/execute.
- Concurrent different-file writers produced40 exact completed files accessible to C.
- Reachable client outside the export allowlist could not mount the same export that C could read; it was hidden with ENOENT, not necessarily EACCES. Read-only client got EROFS on writes.
- Advisory flock exclusion, explicit LOCK_UN acknowledgement and post-exit lock cleanup timing; in the corrected30s lease/grace run, post-exit acquisition had0 retries. An earlier run failed an immediate release assertion; see limitations below.
- Sequential Git init/add/commit then update/add/commit on another client, verified on C.
- Server/container restart retained underlying data and existing clients reconnected. Recorded restart+checks21.559s; not instant recovery.
- Pause caused a fresh write to stall; unpause completed it. This is backend IO behavior, not proof of AutoByteus's not-yet-implemented <=10s admission/diagnostic behavior.

## Observed Limitations And Failed Rounds

| Round | Actual outcome | Investigation/correction |
| --- | --- | --- |
| FR-001 | Service was not usable; Docker mount connection refused | Ganesha startup RPC registration failed without rpcbind/DBus. PID existence was insufficient readiness. FR-002 initializes dependencies and validates real IO. |
| FR-002 | 9 local cases passed; native Mac blocked | NoUI NetFS mount returned errno1/EPERM. No cached sudo/admin access, no UI/credentials solicited automatically. |
| FR-003 | Four cases passed, then harness network configuration failed | Docker static IPs require an explicitly configured subnet. Fresh later owned network is recreated with its observed, non-conflicting subnet; no user network altered. |
| FR-004 | Five passed; denial assertion failed on unexpected ENOENT | Test expected only permission-denied text. Ganesha hides an unauthorized export. FR-005 also proves TCP reachability, authorized access to the same path and absence of a denied-client NFS mount; accepts the supported denial outcome, not arbitrary failure. |
| FR-005 | Eight passed; immediate post-process-exit flock acquisition failed; Mac blocked | Short5s lease/grace and implicit exit timing must not be advertised as immediate release. FR-006 uses30s lease/grace, acknowledges explicit unlock and separately measures implicit release. Earlier failure remains evidence; root cause is not conclusively isolated and requires more realistic/repeated tests. |
| FR-006 | 14 pass, one observation, native Mac still blocked; exit2 | No complete Mac/cross-machine/product setup claim. All recorded owned resources removed. |
| FR-007 | Eight scoped application-image checks pass, exit0; no native Mac attempted | Two fresh default-entrypoint AutoByteus image nodes share the same project through GraphQL, ordinary fs and real application terminal PTYs. Not latest-source-build/LAN/agent/helper validation. All owned resources removed. |
| FR-008 | Five passes incl actual Codex writer, then Claude auth error before file tools; exit1 | Expired copied node-0 Claude login could not refresh. Current Mac login used in next isolated run; no source login/config edit. |
| FR-009 |20 named passes: four setup/topology and16 actual native agent stages; extra Claude peer-stop skill Read fails; exit1 | Four runtime pairs prove selected common root/native file operations. Model quota used, no scripted substitutes. Shared skill-link cleanup remains an in-scope design gap, not all-green proof. |
| FR-010 | Three setup passes, immediate causal unlink assertion fails; exit1 | Configured NFS metadata cache briefly retains B's link. Retained harness timing failure, corrected measurement next round. |
| FR-011 | Three setup passes, three causal bug reproductions; exit2 | Unmodified image materializer in independent nodes: A cleanup removes shared link while B holds descriptor/private source; B observes ENOENT after~1.04s. Not feature pass. |

Linux native inotify probe returned events=0 for a change written through another NFS client, while ordinary fresh reads found the file/content. Thus filesystem accessibility works in the probe without a native remote change event. Do not advertise automatic explorer notifications; product refresh behavior needs deliberate handling/validation under REQ-011.

## Actual Application-Node Experiment — FR-007

- User requested checking another application Docker node and an explanation of easy setup. Only fresh owned nodes used; existing nodes unchanged.
- Application image pinned to sha256:62ee64827c53610eac932413a5cbe11761d713cda46609d2fa53c6495758b35a, created2026-10-12; default image entrypoint. This is image feasibility, NOT a current worktree build or implementation-validation substitute. Selected compiled file hashes retained in result.json.
- Separate fresh private volumes for each node's data, CLI home, workspaces and Chromium; no signed-in credentials/models. Only API ports published on127.0.0.1. Nodes use root and existing launcher SYS_ADMIN/seccomp flags; they are not the zero-capability clients of FR-006. No NFS mount commands run inside them.
- Owned Ganesha service exports one persistent volume; separate daemon-created NFS4.1 volumes expose the same export at /home/autobyteus/shared/project. Export allowlist is the gateway; All_Squash10001 and sec=sys remain an experimental coarse trusted-host policy.
- Eight PASS: both real GraphQL endpoints ready; mounted topology/credential isolation; workspace creation on each through public API; synced ordinary fs A -> API B read/modify -> ordinary A read; API A/B reciprocal edits; real application WebSocket terminal PTYs use selected shared cwd and reciprocally read/modify exact file content; explicit directory/content requests observe remote addition; private data stays separate.
- Timings in result: native/API roundtrip0.175s, API roundtrip0.030s, real PTY case0.980s, explicit directory/content case0.114s. These local case durations are observations, not real-network SLAs.
- Cleanup: exact two application containers plus server,13 named volumes, one network and exact rebuilt service-image tag removed; absence checked. Existing application image retained. No host mount/LAN port/user data altered. run-probe.py, ganesha.conf, image-build.log, probe-console.log, probe-result.json retained under fr-007.
- Proposed product wrapper command remains unimplemented. See ../../application-node-feasibility-context.md for user-requested explanation, with explicit proposed-command label.

## Remaining Mandatory Evidence

1. Approved temporary native Mac mount experiment and ordinary UID501 Mac file operations with the same service. Existing NoUI attempts returned EPERM; do not substitute API reads or Docker-only Linux success.
2. A real separate Linux computer/private-network target and permission to use disposable test resources there. An async question requests OS/version/access method; no passwords requested.
3. Real production-path design/integration including common-storage readiness/no fallback, Desktop/managed-container setup and cancellation/restart, safe recreation/image pinning, runtime skill-link collision/cleanup, explorer refresh and sandbox compatibility.
4. Complete native-runtime compatibility and final product setup workflow. Actual Codex/Claude core journey now demonstrated, including configured skills, through existing-image API/WS/native tools. Shared skill cleanup fails and needs a validated design remedy. Current-worktree build, rendered UI/desktop/LAN journey and implemented setup command remain unproved; real-agent proof does not replace those layers.
5. Permission/security/reference deployment approval implications, actual Mac/linux client/version consistency, repeated lock release and outage/remount proof. Current coarse allowlist/squashing is not silently promoted to the final policy.

The user authorized feasibility experimentation before implementation, not arbitrary live storage, exports or node changes. A second async question requests consent for a disposable Mac mount under /private/tmp/ab-shared-workspace-feasibility-* with OS administrator approval and cleanup. It is pending, not automatically granted by a preselected UI option.

## Commands, Durability And Cleanup

- Image: docker build --progress=plain -t autobyteus-shared-feasibility:fr-001 evidence/feasibility/fr-001/image (run from ticket; actual invocation path recorded in log).
- Each experiment: python3 tickets/in-progress/shared-network-workspaces/evidence/feasibility/fr-00N/run-probe.py, with stdout/stderr tee'd to that fresh round's probe-console.log. Exact commands, timing, configuration and outputs in probe-result.json; use experiment-index.json.
- Early runner rc0 must NOT be interpreted as a green test: fatal/blocked states are in its ledger. Latest FR-006 deliberately exits2 when native Mac coverage remains blocked.
- Exact-resource audit: cleanup-audit.json. All recorded containers/volumes/networks absent, no owned Mac mounts, compiled temporary NetFS probe removed. Exact task image removed after matching its OCI manifest-list digest to original build output. Shared Docker build cache was not globally pruned; no user volumes/images/nodes removed.
- Wholesale upstream Apple source scratch removed; primary URL/hash/consulted lines and SDK authority recorded in fr-001/source-references.json. Probe source is owned experiment code, not product implementation or final API/E2E coverage.
- FR-007: rebuilt cached owned image with docker build --progress=plain -t autobyteus-shared-feasibility:fr-007 -f tickets/in-progress/shared-network-workspaces/evidence/feasibility/fr-007/Dockerfile tickets/in-progress/shared-network-workspaces/evidence/feasibility/fr-007; python3 .../fr-007/run-probe.py. Latest result cleanup includes exact absence checks and matching service-image ID before removing its tag. No global image/cache pruning.
- FR-008–011: analogous fresh-round cached builds and python3 .../fr-00N/run-probe.py; exact argv/config/version/result/console/turn/causal receipts retained. Real native OAuth sources read-only and streamed only to task-owned private homes in FR-008/009; no secret values/host credential scratch retained. FR-010/011 no model/auth use. Eight FR-009 runs terminated; all owned resources removed/absence audited. No native Mac mount this round; source nodes/CLI homes/Keychain not edited.


## Current SR-010 Completed Native Mac/Agent/Readiness/Lifecycle Evidence

Approved intended behavior SR-009 unchanged; full current context is ../../feasibility-blocker-handoff.md. FR-015–033 source/config/actual native turns/failure origins/results/cleanup indexed, never collapsed into blanket green. FR-019 actual native macOS26.6.2 automated VM; FR-022 ordinary Mac plus two Linux API mounts; FR-02611 passes/four actual native turns through normal selected-workspace/run APIs, MacCodex write -> LinuxCodex read/modify -> LinuxClaude read/modify -> MacCodex fresh read. Same /Volumes/autobyteus-shared/project, mounts/storageID/backing and exact hashes agree, no copied nonce prompts/attachments/controller agent-file write. One physical Mac, not second-computer LAN/current source/UI/user command.

Native private-runtime candidate: ClaudeFR-01412 passes/six turns, CodexFR-02011 passes/five turns including peer cleanup and replacement-root same-thread resume; production shared-skill bug remains unpatched. Bounded readiness LinuxFR-0189 passes, MacFR-02914 passes: source/UUID/permission/unavailable/race, private heartbeat, one retained exact child slot until real exit. RPC NULL != identity/write auth, deadline/signals != bounded kernel IO or product integration.

Mac/Linux FR-02814 passes: fresh closed-file visibility under5s in repeat,1MiB binary,40 distinct concurrent files, POSIX advisory lock, scoped Git and pause/recovery2.416s. Default Mac Git foreign owner10001 fails128; no user global wildcard/config added. FR-027 immediate stale read and FR-017 warm permission-cache behavior retained, no instant visibility/revocation guarantee.

FR-03316 passes: owned repeat/occupied-target/privilege/declined-consent/native own-target mount, owned Docker recreation preserves exact image/port/six mounted volumes/private markers/public workspace, actual Mac reboot automatically remounts sameUUID/one mount with independent new kern.boottime47.044s. FR-030 wrong privilege assumption, FR-031 control transport timeout and FR-032 leftover target failures retained. Not final guided setup/normal password-dialog/initial local-node apply/offline login/physical LAN proof.

Entire changed owned VM clones retired (disk/keychain), public immutable base/tool scratch retained. Full exact Docker recheck, secret-pattern/syntax/hygiene checks and no-running-session state at SR010 audit files. No live user storage/mount/container changes, source login edits, local model/global prune/production source implementation. Actual independent Linux/private-network resource unresolved; owned default-Git/runtime/admission/service authorization/setup design still must complete. No finished user command, final size/risk, design-complete/implementation-ready/Terminal/DONE. Broader public service and parked collaboration remain excluded.
