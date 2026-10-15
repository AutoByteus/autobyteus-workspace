# macOS VM Feasibility — Actual Executed Evidence, Not Final Delivery

Owner Solution Designer; shared-network-workspaces, Approved intended behavior SR-009 unchanged. This report records EV-023–029 in canonical investigation notes. User explicitly prefers a fully agent-operated macOS test VM; no authority to modify host/user mounts, user nodes or existing storage. All fresh test targets and private roots belong to this Task. Gates: solution-designer architecture/design authorities, repository AGENTS.md/DESIGN.md/TESTING.md and actual Mac backend launch contracts read.

## Executed Result And Node Table

| Round | Mac node | Linux service / clients | Result | Scope limitation |
| --- | --- | --- | --- | --- |
| FR-019 | ab-sf-fr019-macos, native macOS26.6.2/25G83/Darwin arm64/adminUID501 | None | 4 passes, exit0: boot, control, normal guest private-disk IO, native NFS/admin prerequisites; no user commands or host admin used | CI guest sudo preset; not normal real-user OS approval, sharing or agents |
| FR-021 | Same owned VM | None created | exit1: test wrongly assumes a default gateway in host-only mode; failure retained | No storage mount attempted |
| FR-022 | Same owned VM, host-only192.168.128.2 | ab-sf-fr022-88813f88-storage-server; app-a/app-b | 9 passes, exit0: native Mac NFS mount, reciprocal normal file/API access, replace, symlink/exec, exclusive create | One physical host; component/API only, not models/real LAN/public setup |
| FR-023 | Same owned VM, private NAT | ab-sf-fr023-db476448-storage-server; app-a/app-b | 5 passes, exit1: copied release backend cannot start because test omitted normal private data/config/port arguments | No native model/credential transfer |
| FR-024 | Same owned VM | ab-sf-fr024-3a208da7-storage-server; app-a/app-b | 5 passes, exit1: mandatory public server URL missing from test environment | No native model/credential transfer |
| FR-025 | Same owned VM, private NAT | ab-sf-fr025-1964d0e8-storage-server; app-a/app-b | 7 passes, exit1: backend/workspace/auth/3 actual run creations; Mac actual model turn cannot spawn missing Codex sidecar | No successful native Mac file tool; no core agent-pass claim |
| FR-026 | Fresh ab-sf-fr026-macos | ab-sf-fr026-6af2e9d4-storage-server; app-a/app-b | 11 passes / exit0, four actual native model turns; normal workspace-selected Mac write -> Linux Codex read/modify -> Linux Claude read/modify -> Mac fresh reopen | Not configured-skill adaptation/physical LAN/current source/UI/user-command proof |

All mounted participants in FR-022 use `/Volumes/autobyteus-shared/project`. Same path PLUS actual NFS mounts/source export/UUID and independent exact bytes establish common storage. Native Mac UID501 operations occur through kernel NFS, not a special file API or virtio host folder share. Test-only TCP relay carries NFS to localhost-published Linux Ganesha; no project bytes copied between computers by the controller. Not a proposed production relay or evidence of physical LAN/router/firewall behavior.

FR-022 publishes Mac bytes and reads through both normal registered Linux workspace APIs, modifies through Linux API and freshly reads Mac/peer, replaces from Mac, creates a relative symlink and executable consumed by Linux ordinary CLI, and rejects Mac exclusive creation of an existing Linux file. Exact per-case timings/mount source/data/hash and cleanup are in its probe-result.json. This does not substitute for actual instructed agents.

## Automatic VM Setup, Sources And Honest Limits

Read-only host prerequisites: macOS26.5.2 arm64,64GiB RAM/10 cores,~521GiB initially free. Pinned Tart2.40.1 release SHA verified363e2701154a8155cbc1bb6d845430c9b42697d2a186bc49574471ca2877db46, deep/strict codesign verified, binary works without installing into Applications/PATH or changing host security. Pinned release license FSL-1.1-ALv2 permits internal use; older tart.run Fair Source licensing page is not substituted for its current release license. GitHub original cirruslabs URL redirects to openai/tart. Tool is engineering test infrastructure, not a product dependency.

Public cirruslabs Tahoe image pinned sha256:87f3aa5ce21b5c876268f233bdfecf38b4c2a8116fe9bbb718e714cbae187377,26.98GB compressed/50GB disk. Large download/network retries retained; verified guest hardware supported. Guest-control boot takes135.544s in first4-pass round. No host mount, host-folder share, clipboard/audio/USB or user/admin command; current FS/model rounds use only fresh guest/containers. Host-only guest has no default route by design; exact live address/host bridge lookup fixes that test setup without LAN scanning. Provider tests switch this VM to normal private NAT only.

Primary sources: [Apple macOS VM](https://developer.apple.com/documentation/virtualization/running-macos-in-a-virtual-machine-on-apple-silicon), [Apple Tahoe license](https://www.apple.com/legal/sla/docs/macOSTahoe.pdf), [Docker's Linux VM](https://docs.docker.com/desktop/features/vmm/), [Tart quick start](https://tart.run/quick-start/), [guest command mechanism](https://tart.run/blog/2025/06/01/bridging-the-gaps-with-the-tart-guest-agent/), [pinned tool license](https://github.com/openai/tart/blob/2.40.1/LICENSE). Actual behavior comes from owned receipts, not those pages alone.

Mac backend/client installation is test provisioning, not user setup: copy public installed1.5.3-beta.1 application/server0.1.1 and native Codex0.162.1, invoke its existing Electron Node24.16 mode with fresh private data/config/HOME/CLI home. No source JS change, host app launch/data access or current-worktree-build claim. Normal startup uses --data-dir/--port and public URL environment; captured early harness failures remain failures. Codex requires its co-located code-mode host, not only its main executable; FR-025 router error establishes the incomplete-copy cause. No filesystem inference is made from an unavailable native tool.

## Safety And Continuing Boundary

Source application/client software read-only. OAuth source read-only narrow stream into private homes only when required; no host credential scratch or logged values. All completed Docker round resources removed; Mac native mounts detached before exporter cleanup and VM stopped. Since FR-025 imported actual user OAuth, the entire changed VM clone is retired/deleted (disk/keychain), confirmed absent, and a new clean clone created for FR-026. Public immutable base remains separately cached; do not claim that this cache is deleted. No global pruning or existing user node/mount/storage recreation.

Native Mac core journey now passes (details below); Git/trust and Mac lock/outage/consistency cases, safe complete one-command create/join/selected-Docker/rerun/restart/normal OS approval, physical multi-computer LAN, current source/GUI/independent reviews/merge/user verification and final delivery remain separate incomplete gates. The final user command does not exist yet; internal Python/Tart/build/mount scripts are not it. Requirements stay Approved SR-009, formal design not complete and no implementation-ready route.


## FR-026 — Actual Three-Node Agent Journey

11 named checks/exit0, four actual native turns, three normal public-API workspace-selected runs. Same `/Volumes/autobyteus-shared/project` on all. A Mac gpt-5.6-luna/Codex0.162.1; B Linux gpt-5.6-luna/Codex0.162.1; C Linux haiku/Claude2.1.296 SDK0.3.280. Mac uses copied existing public release backend0.1.1/Node24.16, not current-worktree build. Source choices `autoExecuteTools:true` through normal public run input, not changed global permission settings. Model/tool policies remain those of these real adapters.

| Stage | Actual node | Native runtime | Result |
| --- | --- | --- | --- |
| A writes exact LF-terminated/fsynced file | ab-sf-fr026-macos (Darwin/adminUID501) | Codex, native zsh/Python/fsync | PASS |
| B reads unknown A bytes and appends own value | ab-sf-fr026-6af2e9d4-app-a (Linux) | Codex, native Bash/Python | PASS |
| C reads unknown A+B bytes and appends own value | ab-sf-fr026-6af2e9d4-app-b (Linux) | Claude, native Bash/Python | PASS |
| A freshly reads both unknown Linux modifications | ab-sf-fr026-macos | Codex, native zsh/cat | PASS |

Prompts to B/C omit previous file values; A reopen prompt omits both new values. Native successful commands/actual cwd/stdout and independent exact bytes/SHA256 through both Linux workspace APIs, native Mac cat and backing export agree. No copied file attachments, special sharing API or controller write to that agent filename. Full run IDs/commands/native receipts/snapshots at fr-026/probe-result.json and mac-three-node-agent-proof.json. Actual events, not model prose alone.

All three runs terminate through public APIs, private guest backend stopped, test software/data/credential root removed, native NFS detached before exporter cleanup and VM stopped. Entire changed credential-bearing ab-sf-fr026-macos disk/keychain deleted/absence checked; only public immutable baseline cache retained. Exact lifecycle receipts fr-026/vm-replacement-audit.json and vm-final-cleanup.json. All recorded owned Docker resources absent in current sr010-docker-resource-audit.json. No live user app/node/mount/config/source changes. Old failures remain failures.

This proves the requested core agent sharing journey on actual Mac and Linux kernels using a virtualized local test network. It does NOT prove a second physical computer/LAN, finished setup invocation, normal user administrator/disruption flow, Git/default trust, Mac locks/outage/restart or configured-skill production remedy. These remain required before final completion; do not mark100%/Terminal/DONE or route premature implementation.


## Additional Native Mac Contract And Failure Checks — FR-027–030

| Round | Mac node | Linux service / clients | Actual result | Unsolved boundary |
| --- | --- | --- | --- | --- |
| FR-027 | ab-sf-fr027-macos | ab-sf-fr027-19d964a7-storage-server / app-a / app-b |5 passes,exit1: immediate Mac stale cache read at0.319s; approved5-second bound not measured here | Retained failed assertion, not a proved latency violation or later pass |
| FR-028 | ab-sf-fr027-macos | ab-sf-fr028-37de3ffb-storage-server / app-a / app-b |14 passes,exit0: both directions/replace0.160–0.210s;1MiB binary;40 different concurrent files; cross-client POSIX advisory lock; Git scoped-trust transaction; pause/recovery2.416s | Default Mac Git fails dubious ownership128; exact-repo process trust not implemented in product; not a general IO deadline |
| FR-029 | ab-sf-fr027-macos | ab-sf-fr029-8e9b3dda-storage-server / app-a / app-b |14 passes,exit0: Mac source/UUID/missing/permission/transport timeout/race/recovery, private heartbeat and exact child ownership | Python component mechanism, not Node-distributed inspector or all production paths/write-readiness |
| FR-030 | ab-sf-fr027-macos | ab-sf-fr030-e9479bcd-storage-server / app-a / app-b |11 passes,exit1: repeat/occupied-target checks pass; nativeUID501 unexpectedly allowed mount to its own directory | Incorrect mandatory-denial harness assumption; remaining lifecycle cases not executed. Failed side mount not explicitly unmounted; entire stopped credential-free clone deleted before FR-031 |

All use ordinary kernel NFS at the same project root. No host mount, user node or provider credentials in these rounds. Private user-owned Git config remains unchanged: scoped trust only in the test process. Permission-revocation cache caveat from FR-017 remains unresolved. Native user-owned NFS mount success in this CI guest does not override old host NetFS NoUI failures, guarantee all Mac policies, or validate a real user's OS approval/password flow.

Explicit source/result/failure/cleanup artifacts are in each round directory; earlier Mac credential-bearing clones retired. Later credential-free clone027 retired too; public immutable cache retained. Final user command, private-LAN endpoint, normal OS/disruption workflow, production default Git/runtime skill/admission adaptation, current-source/UI/review/merge/user verification remain incomplete. Earlier paragraphs describing Mac locks/outage/readiness as wholly untested are historical; above results supersede those sub-gaps only.


## Setup Lifecycle — Final Executed Round FR-033

FR-03115 passes/exit1 reboot control timeout; FR-0323 passes/exit1 leftover owned target prerequisite. Failed rounds remain failed; retired entire stopped no-auth clone031, never force-mount over unknown target. FR-033 cached clean public clone,16 passes/exit0, no inference/auth.

| Check | Actual node | Result | Limitation |
| --- | --- | --- | --- |
| Repeat existing setup state | ab-sf-fr033-macos | Same UUID/one mount, no extra mount call | State mechanism, not implemented guided command |
| Nonempty location/authorization | ab-sf-fr033-macos | Nonempty owned folder refused/bytes preserved; nativeUID501 own-directory mount works/explicitly detached; nobody admin sudo denied | CI permissions, not host OS/password-dialog proof |
| Declined disruption | ab-sf-fr033-75927368-app-a | Same container stays running, no stop/remove called | Fixture consent=false, not implemented prompt |
| Approved isolated recreation | ab-sf-fr033-75927368-app-a; peer -app-b | Image/port/six exact mount mappings/private bytes and registered workspace preserved | Existing fresh test node, not arbitrary user configuration or initial local-to-network apply |
| Actual Mac reboot and automatic reconnect | ab-sf-fr033-macos; storage ab-sf-fr033-75927368-storage-server | Different native boot time, one NFS mount/sameUUID, root job exit0, postboot file access;47.044s | Healthy service/stable guestIP/root fixture job; no offline-login/full helper/normal consent proof |

System job/helper removed before guest shutdown; main mount detached; VM stopped and entire changed clone deleted, absence confirmed in task-private Tart inventory. All owned local clones deleted including credential-bearing ones; public immutable baseline cache and task-private tool scratch explicitly retained, no global prune. fr-033/vm-final-cleanup.json and current full sr010-docker-resource-audit.json are final receipts. All executed round sessions have exited.

Current result: physical independent Linux/LAN target/access still unavailable (direct resource question pending), complete product default Git/private-runtime/admission/setup/security design and downstream source/UI/review/merge/user verification incomplete. No ready user command, Architecture Design Complete or final delivery claim.
