# API/E2E Execution Coverage Report — Shared Network Workspaces

## Latest authoritative result

**API-REV-003 / Round 3: Fail. Final confidence 57.14%. Broader validation Required.**

**API-F002 resolved first:** fresh Ubuntu native public create and reconnect now pass with the exact retained patched engine pair, current CLI metadata, default directory delegations and real confined nonroot verification. **API-F003:** ordinary Linux machine reboot leaves the previously running selected managed Docker client stopped. Its NFS volume mount was refused during Docker startup; later the storage engine and native host mount are healthy, but the selected node/API do not recover automatically. Public reconnect leaves the node stopped. This is supported normal restart, **not** the deferred outage-isolation requirement.

Personal checks also passed Linux native/Docker storage lifecycle, managed Docker client create/reconnect and exact preservation, mounted HTTP/GraphQL/WebSocket/Git/lock operations, and a current-build Mac desktop's remote mounted previews/Guide. None proves the remaining complete matrix. Preliminary failure classification **Unclear — likely implementation/dependency lifecycle integration**; request focused failure-origin review, not successful test-code review. No production fix, whole-product Pass, Delivery signoff or published-installer qualification.

## Authority / execution metadata

- Task `project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63`; worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces`; branch `codex/shared-network-workspaces`; finalization `origin/personal`. **Large / High / Reviewed** unchanged.
- Source-review commit `68fcb74588d502570dc511b46bc6e7918bc538c8`; actual execution/build input HEAD `e8ed5627da2afa646c9ab89c6ce69b3a0bc0826c` adds only CRR007 handoff receipt/history, no source delta; CRR007 Source Pass; IR006 `eb7934072a1f98832b7b6330a1bc6a7f348fd93d`. Approved SR018 / Ready SR020 / ARCH-REV004. Source-review100/100 is not API confidence. No production or durable-test edit in this round.
- Authorities: [requirements](requirements-doc.md), [approval](approval-record-sr018.md), [investigation](investigation-notes.md), [design](design-spec.md), [solution history](solution-revision-record.md), [solution handoff](solution-design-handoff.md), [architecture review](design-review-report.md), [architecture history](architecture-review-revision-record.md), [implementation](implementation-handoff.md), [implementation history](implementation-revision-record.md), [source review](code-review-report.md), [source history](code-review-revision-record.md).
- [Coverage investigation](api-e2e-coverage-investigation.md), [ledger](api-e2e-test-case-ledger.md), [API revision record](api-e2e-revision-record.md). Previous API001/002 Fail57.14% and original failures remain historical, not relabelled. API-F001's independently proven Round2 nativeMac correction remains resolved at that scope.
- **E3** below = [evidence/api-e2e/api-rev-003](evidence/api-e2e/api-rev-003/); E1/E2 are adjacent earlier evidence directories. [Package index](evidence/api-e2e/api-rev-003/package-index.json) retains all453 incoming references plus current evidence and the unchanged API-owned REST test. Delivery report/revision: **N/A — not yet performed**; Product supplement: **N/A — not applicable**.
- Personal execution only; no workers/delegation. No merge/push/tag/public release, main Task completion or explicit final user verification.

## Investigation / command and environment basis

Investigation and ledger preceded execution. Read root AGENTS/DESIGN/TESTING, package AGENTS/readmes, NFS packaging/release instructions, Dockerfile.monorepo, public launcher and isolated-app documentation. Existing durable assertions remain valid; no stale coverage deleted. IR006 compatibility/persisted-data sections read: no legacy wrapper/migration required. Existing source/known-field registry/run/launcher state remains directly usable; private profiles rebuild. No source pin/copy/refcount/retirement introduced or tested as a requirement.

Prior defect was rechecked first; only toolchain/candidate setup preceded it. Then N01 repository checks and a recorded57.14% gate required broader execution. Exact argv, cwd, baseline environment, output/exit codes and timings are retained in E3 scripts/results. Commands include `go test -race ./...`, `go vet ./...`, five Python unittest modules, public NFS CLI, normal Docker launcher, full documented server image build, and `pnpm --silent isolated-app start --build`. Builds serialized. No inherited user app roots/provider keys; only owned HOME/TMPDIR/data/ports.

Host Mac26.5.2/25F84 arm64/M1Max, Tart2.40.1, checksum-verified private Go1.27.2. Ubuntu24.04.5 arm64/ext4/kernel7.0.0-38-generic from digest `94dbb9c4b94db827a208fea301cf33eacdcbfb801155b5702b9e2faa52473a2e`; real guest sudo and nonroot1000:109, cleared supplementary groups. Default `/sys/module/nfsv4/parameters/directory_delegations=Y`; hard TCP NFS4.1. Three fresh clones; final clone `ab-nfs-api003-linux-b7497a85`, endpoint192.168.64.7. Initially2CPU/4GB/20GB; cleanly powered off and expanded to4CPU/6GB/60GB before the full client image, same source identity. Docker29.1.3. No independent physical topology inferred.

### Exact candidate provenance — not release qualification

- Current default source aggregate `4568593b99bb3dff263e9824ceb7176e04a95ec90e3cd14a9f7421b4e43055ac`; actual retained arm64 manifest plus current source `5563645d23aaac13aaa26948490d68dfc12fef31775bb66156185f9052ab0acc`.
- Reused and verified all11 retained IR005 files, **no engine rebuild**. Main .deb SHA `0b5c78911cfc1b299e9894e1f841e74176fbb2cb45b158008e4530713549ebc8`; VFS `3bf06769646d93ea85f0277fe0726eb42d0d29a70c0108505706954e5e8d2ac6`; modified corresponding source `eed35ab4b732ac05d2afc3531e70cdc27031fb414fdb52a0daf093f33daaec0a`.
- Regenerated CLI release metadata using current `release.py --tag v1.5.3-beta.2 --engine-manifest ...` in an owned source copy, then `GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build -trimpath`. Copied-tree changes only metadata and embedded exact .debs. Native CLI SHA `0f7d6a37e8d418f3fd16ae83e16ef4ca45fd75311a93cb40237665afca4db2b4` (E3/build-result.json).
- Docker variant CLI SHA `532b98169d7434cd76d9e279397fc6a03a00f9dabb1fcf951dfdad75471169ff`; same engine/source, actual image `127.0.0.1:5000/ab-nfs-api003@sha256:22f64bbfec2bbdd1ba49516e35b43436826b006fb1274435631586252a5875b6` built from unchanged packaging Dockerfile and retained pair/source/notices (build-docker-result.json, linux-docker-prepare-result.json).
- Actual full current server image `sha256:dd986b8ae47f0947516d1b708df200161d28a33706eb177b59b1afa70be937b4`: clean tracked HEAD context/unchanged Dockerfile.monorepo, then exact image transferred to guest. Existing beta image had56 JS deltas outside ticket, so the forbidden stale-image/dist-overlay shortcut was **not** used. Only VM-loopback registries, no public publication (server-build-v2-result.json, managed-client-image-result.json).
- Empty qualifiedTargets; default engine:null/Guide unavailable intentional. Native amd64 engine, hosted workflow/signing/notarization/published bootstrap unexecuted. Old IR005 CLI/aggregate not represented as current.

## Prior failure resolution / executed-case reconciliation

| Case / boundary | Result and evidence | Limits |
| --- | --- | --- |
| V03 prior API-F002, public native create FIRST | **Pass** linux-public-final-result.json; fresh create16.778s, reconnect0.508/0.605s; original/mounted bytes+UUID, inode/device/owner/mode, actual root binary/private700/600/public644, engine and managed job, cleared-group nonroot/defaultY | First two fresh create commands also passed16.044/16.215s, but later harness assertions failed; retained separately. No manual engine installation or marker bypass |
| N01 current repository | **Pass with skips** narrow-checks-result.json:7 Go packages race16.546s/vet5.553s; Python52enumerated/49pass/3skip41.364s | Go-parent executes real child skipped by standalone Python; pwsh unavailable; user's occupied8001 untouched. Not whole repository green |
| V03 native normal operations/reboot/detach | **Pass** linux-lifecycle-resume-result.json plus original lifecycle fileops | write/fsync/rename/relative symlink/mode,20 directory reopen checks; automatic remount no reconnect, same original source/UUID and public drained detach. First status omitted --yes, correctly declined |
| V03 Docker storage/native self-client | **Pass** linux-docker-public-result.json, linux-docker-lifecycle-resume-result.json | Distinct nonempty source, actual engine/image; create/reconnect, operations/reboot automatic remount/drained detach/preservation. Immediate status initially hit live administrative lock, later ordinary status passed, not a product defect |
| V03 Linux managed Docker create/reconnect | **Pass** linux-managed-client-confirm-result.json | Exact image/full Config/HostConfig except intended NFS additions, prior mounts/private synthetic auth/data/browser bytes/ports/network alias; unselected node unchanged/stopped. Source identity/UUID preserved |
| V03 mounted API/Git | **Pass** mounted-api-resume-result.json, mounted-api-mutations-result.json | Actual HTTP/GraphQL CRUD/HTML/static/relative PNG/replace/delete404 and WebSocket PTY. Mounted cwd; Git child-only safe.directory and unchanged global/parent env. No provider turns |
| V03 locks | **Pass** mounted-lock-result.json | Real native mount POSIX record lock denies Docker distinct-volume client until ordinary release, then fsync write. Same kernel/VM, not physical peers |
| V04 current desktop | **Partial Pass** desktop-validation-result.json, desktop-*.json/screenshots | Actual isolated Mac desktop remote window: Guide unavailable/copy-disabled/warnings; Files tree, HTML iframe+decoded relative image, image preview, external-source text after visibility reload. Not all media/unsaved buffers/completed-agent artifacts |
| V03 selected-node normal restart | **Pass** first3cases managed-lifecycle-result.json | docker restart, healthy API/status, exact node config/private data/ports/alias and stopped unselected node |
| V03 whole machine reboot | **Fail, API-F003** managed-lifecycle-result.json, managed-reboot-diagnostic.json; focused managed-reboot-repro-result.json | Selected client stays stopped despite healthy storage/native mount; details below. No unrelated matrix expansion after finding |
| V01/V02 Mac / V05 native runtimes / physical matrix | **Not Tested this round**; prior scoped results and environment limits retained | Mac managedDocker clients, independent peers, actual native tools/assets/close/restore/Standalone-Team-Org remain |
| N02–N04 carried | E1 N02 133pass; original contracts35pass/5fixturefail, corrected workspace6pass; scriptedAGY8pass; Guide21/terminal109pass | Not rerun this round; durable/source paths unchanged, mocks/scripted transport not promoted |

**Harness/setup errors retained, not product findings:** wrong sysfs module path; wrapped-versus-direct status JSON; missing --yes; startup admin lock; tracked-public-.env filename guard; redundant growpart NOCHANGE after automatic resize; daemon default port-binding assumption; Docker Mounts array order; PTY bare-CR receipt parser; ssh.service inactive while ssh.socket active; one UI NOT_FOUND selector; cleanup compared pre-boot Docker Dns:null to post-boot Dns:[] and omitted the expected product-owned recreation label. The latter was verified already present before detach, not changed by cleanup; other opaque config assertions remain exact. Corrected runs have separate receipts. Initial launcher containers were stopped/recreated **before NFS** with exact opaque Config/HostConfig and explicit127.0.0.1 ports; no real credentials or user nodes. Mounted HTML's benign source fixture postMessage validates actual iframe source/origin/decoded image, not a mocked product reader. Watcher did not auto-update within3s; documented Files hide/reopen produced correct bytes. Automatic notifications are unsupported SCN007, not a new finding.

## API-F003 — ordinary Linux reboot does not recover selected managed Docker client

**Expected:** AC-007/014/018/019, SCN-009/013: saved supported configuration resumes same storage and previously running managed client after ordinary restart without manual container/mount commands. Source/private preservation relates AC-009/017. Storage and client are both on the supported Docker-on-Linux host; no outage injection, endpoint change, network isolation or forced timing.

**Setup/trigger:** public launcher created selected `autobyteus-server-0` and stopped unselected `autobyteus-server-1`. After test-only loopback binding and alias/sentinel fixture preparation, public CLI admitted selected node via:

```sh
BIN create --source /home/admin/ab-nfs-api003-linux-b7497a85-docker-source \
 --backend ganesha-docker --endpoint 192.168.64.7 --allow 192.168.64.7 \
 --nodes autobyteus-server-0 --yes --drained --json
# Ordinary selected-node docker restart succeeds; then ordinary machine restart:
sudo -n systemctl reboot
```

BIN is `/home/admin/ab-nfs-api003-linux-b7497a85-binary`, Docker CLI hash above; public commands run using `sudo -n setpriv --reuid=1000 --regid=109 --clear-groups env -i HOME=/home/admin PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin LANG=C /bin/sh -c ...`. Selected restart policy is **unless-stopped**, running/healthy before reboot, no intentional stop. Node ID `689c89e631dd82ef0f57b454332f3a57d45806e898dc5c3e00f1c3240e7c0a38`; storage UUID `71887d49-17ec-4e6f-a734-03ebd3abaafd`; original source identity `64769:787680:1000:109:755`.

**Observed first reboot:** bootID changed to `a9d015f0-147e-4827-9825-4c68cb8143ba`. Within Docker startup, journal07:40:10.280 reports failed selected-container start because NFS local volume mount returns **connection refused**, with hard,tcp,vers4.1,actimeo1,timeo50,retrans2,nosharecache. Container `State`: exited, exit255, OOMKilledfalse, Restartingfalse. Engine subsequently running; native hostReadytrue with exact source/mounted bytes and UUID/defaultY. Over150s observation plus later diagnostic, public status remains `attached, stopped (not ready)` and guest-loopback API8001 refuses connection. It does **not** falsely report node ready. Public reconnect returns the same stopped-node status.

The compact [failure summary](evidence/api-e2e/api-rev-003/new-failure-summary.json) and raw diagnostic/reproduction contain timings, complete configs and journal. Manual `docker start` is used **only after recording failure** to restore the exact node for a second normal reboot: it restores actual API/readiness without changing image/config/HostConfig/source; it is not a qualifying automatic recovery. The second ordinary reboot **reproduced** the same selected-volume connection refusal/stopped-node failure: bootID `9132285f-1f71-4078-a84c-b5f986712316`,15 observations across150s, then hostReadytrue with the same source/mounted identity and UUID but unavailable selected API. Raw observations are retained separately, never substituted for the first.

Preliminary **Unclear**, recommended initial owner implementation/lifecycle integration after independent review. Evidence directly establishes boot-time mount refusal and absent selected-client recovery; it does not establish an acceptable repair or which design owner must change. Source pointers: `internal/setup/lifecycle.go` Reconnect ensures storage/host mount/nonroot probe but does not start stopped selected nodes; `internal/service/supervisor.go` serial30s reconciliation; Docker engine/client owners and job startup configuration. Preserve intentional stopped-node semantics and exact private state. Do **not** infer a blanket restart loop, forced unmount, generic outage watcher or fallback requirement. Reviewer must determine failure origin/design impact.

## Acceptance-criteria proof

Whole criteria judged; no user-only waiver. All critical. Detailed case receipts above and package index provide absolute references.

| AC | Proof gained / remaining | Result |
| --- | --- | --- |
| 001 | Native Mac prior; Linux native/Docker storage and Docker client now direct. Independent cross-machine/full OS matrix absent | Not Proven |
| 002 | E1 bindings/profiles/AGY/local; actual native tool/assets/peer-close/restore/Standalone-Team-Org absent | Not Proven |
| 003 | Storage-side replacement/visibility and refresh direct; independent peer <=5s matrix absent | Not Proven |
| 004 | Mounted PTY/Git and real two-mount locks pass; cross-machine/coordinated Git matrix absent | Not Proven |
| 005 | Lock contention proved, general independent concurrent-file peers absent | Not Proven |
| 006 | Actual mounted admission/readiness and no substitute; runtime admission matrix incomplete | Not Proven |
| 007 | Native/Docker storage reboot pass; selected Docker client whole-host reboot fails API-F003 | Fail in tested mode |
| 008 | Native nonroot/defaultY and actual root private modes, Docker mapping; authorization/bothOS matrix incomplete | Not Proven |
| 009 | Exact selected/unselected config/image/private synthetic auth/volumes/ports/alias preserved through create/reconnect/node restart; broader rollback/detach/modes incomplete | Not Proven |
| 010 | Actual mounted APIs and isolated desktop HTML/relativePNG/image/text pass; completed-agent artifacts/all representative media/unsaved buffers absent | Not Proven |
| 011 | Delivery/docs/finalization/user verification/release not performed | Not Proven |
| 012 | Native first-use regressions resolved; DockerLinux public create pass; guided/published/bootstrap/full mode matrix incomplete | Not Proven |
| 013 | Real public launcher plus selected Linux node admission; Mac managedDocker client unproven | Not Proven |
| 014 | Storage repeat/reboot/detach pass; selected client host reboot fails | Fail in tested mode |
| 015 | Earlier peer attempt blocked by private NAT; no healthy independent second-computer proof | Not Proven |
| 016 | Retained SR017–020 feasibility/selection/ARCH004 evidence | Proven for prior feasibility gate only |
| 017 | Original inode/device/ownership/mode/bytes/UUID preserved, reciprocal operations, native/storage reboot/detach pass; full matrix absent | Not Proven |
| 018 | NativeLinux/DockerLinux plus Linux Docker client direct, but normal restart fail and remaining Mac client/physical modes absent | Fail in tested mode |
| 019 | Managed service after terminal exit and native storage reboot pass; selected client normal host reboot fails | Fail in tested mode |
| 020 | Actual current Guide unavailable/copy-disabled/disclosure assertions pass; published qualification intentionally absent | Partial proof; not whole criterion Pass |

## Confidence and broader-validation gate

| Mandatory category | Post-repository | Final | Evidence and remaining uncertainty |
| --- | ---: | ---: | --- |
| Requirement/acceptance proof | 50% | 50% | API-F002 resolved; API-F003 critical restart failure and incomplete supported matrix |
| Changed-boundary directness | 50% | 50% | Real Linux host/container/kernel/current desktop APIs added; critical native runtime and bothOS clients missing |
| Cross-boundary integration realism/mock gap | 50% | 50% | Real mounted server/PTY/renderer/locks; independent physical peers/runtime turns absent |
| Environment/config/identity/fixture fidelity | 50% | 50% | Exact engine/image/clean builds/root/nonroot and synthetic private preservation; authenticated native/physical targets absent |
| Failure/edge/lifecycle/recovery | 50% | 50% | Native storage reboot/detach strong; selected-client normal host reboot fails; broader rollback/cancel incomplete |
| User-surface/browser/desktop-shell | 75% | 75% | Direct mounted remote-window Guide/HTML/image/text gains; completed-artifact/other material preview journeys partial |
| Durable regression quality/relevance | 75% | 75% | Relevant current engine/workflow/bootstrap Go/Python and retained REST fix; actual boot regression needs owner resolution |

Simple average400/7 = **57.14%** at both gates. Same anchor is intentional: substantially deeper evidence does not erase remaining critical missing/failing portions. This is confidence, not statistical reliability/pass-rate. All categories below90%;95% clean target not met. **Broader Required**, personally executed, now rerouted on an actual failure rather than called dependency-only Blocked. No advanced outage requirement deducted.

## Residual scope / retained non-green baseline

Independent physicalMac/Linux/Docker and healthy peer network; Mac managedDocker clients; Linux managed client against remaining storage/client combinations; exact lifecycle/rollback/detach/preservation matrix; actual native tools/unread current linked support assets/peer-close/restore/Standalone-Team-Org; SourceUpdate/Remove plus AGY/local policies in actual runtime; completed-agent artifacts and remaining healthy previews remain. Requested test-only physical access, private-LAN topology and authorized native profiles/inference budget; none inferred from silence. Earlier Mac peer routeREJECT remains an environment limitation, not a product outage defect. HTTP SSH loopback forward for desktop was not an NFS peer routing workaround. No host bridge/router/firewall/ARP bypass performed.

D001/DEC015 outage hardening **deferred NOT fixed**, no action workers/per-action probes/stream leases/cwd trampolines/fallback gate. Only MacDocker STORAGE deferred. Default unqualified release/Guide unavailable intentional. Hosted Actions scheduling/signing/publication and native amd64 engine unexecuted. Delivery owns docs/finalization/explicit user verification/authorized release.

Historical IR002 Nuxt4258pass/3fail/5skip and Electron188pass/3fail/1skip remain the same three unchanged updater-category failures; FUP001 already PM custody. Candidate-only green logs are **not current source**. No patch/suppression/duplicate notification and no NFS score penalty. Repository-wide green is not claimed. N02–N04 retained evidence is historical, not fresh execution.

## Durable coverage / temporary evidence / cleanup

No durable coverage change this round. Cumulative `autobyteus-server-ts/tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts`, test-only commit `af9f23df93a63ca6c8305f51439a855acc2133c7`, remains unchanged. Successful proportional review awaits a passed package. Temporary E3 scripts enter actual public setup/client APIs and ordinary reboot; internal structures/read-only journal only diagnose after failure. No test bypass or production patch. No removed test path.

Cleanup receipts: E3/cleanup.json (final inventory), initial-vms-cleanup.json, desktop-validation-result.json, managed-detach-cleanup-result.json and managed-detach-confirm-result.json (successful public detach, then corrected read-only preservation confirmation). All three exact Linux VM clones/processes are absent; desktop/tunnel stopped, host `ab-nfs-api003-server:current` tag and never-started audit container absent; owned scratch removed. Only exact owned VM/processes/containers/tag/scratch removed; public Mac cache, retained IR005 candidate and five preexisting generated dist trees remain. Original sources/private test volumes live only inside disposed guests, no user data deletion. The diagnostic manual node start/cleanup detach never changes failed-reboot qualification. No running/interrupted case is promoted to Pass; raw snapshot-only `Running` fields are reconciled by final artifact audit.

Next: fresh handoff rule, complete failure package to the exact focused failure-origin recipient. No Delivery/Task completion or successful test-code review implied. Confirmed receipt in E3/routing.json establishes delivery, not this intent statement.

Fresh rule selected: **When API/E2E validation fails and the complete failure package requires focused failure-origin review by the code reviewer.** Exact recipient `/software_engineering_team/code_reviewer`; E3/routing.json. Only this recipient for this outcome. Report and complete evidence are persisted before sending.

Packaging audit:45 trailing-whitespace warnings are raw retained Go/build output only; authored artifact/source whitespace check passes. Logs are not normalized to hide original output (E3/packaging-check.json). Evidence/source/reference/cleanup audit passes; that audit is not product validation.
