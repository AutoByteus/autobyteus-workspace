# API/E2E Execution Coverage Report — Shared Network Workspaces

## Latest authoritative result

**API-REV-004 / Round 4: Fail. Final confidence 57.14%. Broader validation Required.**

**API-F003 resolved first at the tested Linux Docker-storage/managed-client scope:** fresh public selected setup and **two ordinary whole-host reboots without manual Start/reconnect** restore the same node, actual API and mounted bytes. Normal Stop, captured failed-start policy veto, node restart, launcher replacement and safe detach also pass.

**New API-F004:** on healthy native Ubuntu storage, a source writer flushes, fsyncs and closes a small file, yet fresh native NFS opens and the managed Docker node's real HTTP reads return old bytes for approximately **61 seconds**, exceeding **AC-003's five-second limit**. Two unique1024-byte fixtures reproduce this independently of the renderer. Preliminary **Unclear — likely implementation/engine cache integration**; focused failure-origin review must determine the responsible owner and any design impact. No production fix or successful test-code/Delivery signoff is implied.

## Authority and execution basis

- Task `project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63`; **Large / High / Reviewed**. Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces`; branch `codex/shared-network-workspaces`; finalization `origin/personal`.
- Actual input HEAD `902638e584d8e669b632cf81bcc0a95074892403`: CRR009 review `4d686e9371e9e8251c351efd6050c38536375419` plus three receipt/history-only paths. Source fix `d318bd9db935affdf16d141ef4e88a6c0e4939b5`; IR007, Approved SR018 / Ready SR021 / ARCH-REV005. CRR009 Source Pass100/100 is not completion confidence.
- Active authorities: [requirements](requirements-doc.md), [approval](approval-record-sr018.md), [investigation](investigation-notes.md), [design](design-spec.md), [solution history](solution-revision-record.md), [solution handoff](solution-design-handoff.md), [architecture review](design-review-report.md), [architecture history](architecture-review-revision-record.md), [implementation](implementation-handoff.md), [implementation history](implementation-revision-record.md), [source review](code-review-report.md), [source history](code-review-revision-record.md).
- [Coverage investigation](api-e2e-coverage-investigation.md), [ledger](api-e2e-test-case-ledger.md), [API revision history](api-e2e-revision-record.md). API001–003 raw failures remain historical; API-F001/F002 scoped resolutions remain. This report supersedes API003's current-round authority, not its evidence.
- **E4** = [evidence/api-e2e/api-rev-004](evidence/api-e2e/api-rev-004/). [Complete package index](evidence/api-e2e/api-rev-004/package-index.json) preserves all774 incoming references plus this round's artifacts. No production or durable-test change this round. Cumulative `af9f23` REST coverage remains unchanged; successful proportional test-code review still awaits a passed package. Delivery report/revision **N/A — not yet performed**; Product supplement **N/A — not applicable**.
- Personal execution only; no delegation/spawning. No merge/push/tag/release/TaskDone or final user-verification claim.

Investigation/ledger preceded execution. Root AGENTS/DESIGN/TESTING, package AGENTS/readmes, NFS packaging/release docs, unchanged Dockerfile.monorepo, public launcher and isolated-instance/browser instructions govern the commands. Existing durable assertions remain valid; none removed. IR007 legacy/removal and persisted-transition checks read: existing state directly usable; bounded attempt is a new subject, no migration/history/TTL. Real current-reference replacement and exact attempt cleanup executed; no private source pin/copy/refcount/retirement mechanism introduced.

Scripts/results retain exact argv, environment, exit codes, timings and assertions. Owned HOME/TMPDIR/profiles/data only; no user credentials or provider turns. Builds serialized. Ubuntu24.04.5/ext4/kernel7.0.0-38/aarch64,4CPU6GB60GB, default directorydelegationsY; real sudo/nonroot1000:109 with cleared groups. Guest Docker29.1.3; Mac native VM fresh APFS/root install and launchd. Linux clone `ab-nfs-api004-linux-9591ce1a`, endpoint192.168.64.4; Mac clone `ab-nfs-api004-mac-5427b9a1`, endpoint192.168.64.2. Both retired. Exact public base digests/resources in E4/linux-resource.json and mac-peer-resource.json. These are virtual systems, not independently qualified physical hardware.

### Build identity — candidate only

- Default source aggregate `968f6d000d4b6c2cc3c66cd3add5845cb30385cdad752fe831b564823db9b764`; exact retained arm64 engine manifest/current source aggregate `51f81cd187caf269ecffa83fecc35a4f665b70942716d7858fa7d964d3b335ed`.
- All11 IR005 plus4 IR007 retained files independently hashed; unchanged after cleanup. Engine **not rebuilt**: main deb `0b5c78911cfc1b299e9894e1f841e74176fbb2cb45b158008e4530713549ebc8`, VFS `3bf06769646d93ea85f0277fe0726eb42d0d29a70c0108505706954e5e8d2ac6`, corresponding source `eed35ab4b732ac05d2afc3531e70cdc27031fb414fdb52a0daf093f33daaec0a`.
- Private checksum-verified Go1.27.2 independently regenerated current metadata/CLI from owned source copy; only release metadata and embedded exact pair differ in that copy. NativeLinux CLI `0036ccef0bbb2a2510064f2e882b692687a2288eb25563d89f9c4ac9150c860c` exactly reproduces IR007. Mac retained CLI `64085e451774b99666ae272c78111d3f3c3972a619aa4cf7e4da657abb79df04` exercised directly.
- Actual Docker-storage image `127.0.0.1:5000/ab-nfs-api004@sha256:34197bbbfb60990b3da046d2442c2e28eaaf66c195c2a94883bd90e15876dc78`; corresponding CLI `4360002f6e62dde7242863929a7e469e04439aa891000b1f52327ef9ff50caf7`. Same engine/source, owned loopback registry only.
- Full current server image `sha256:c4338af68b8608226655056dc7c52d76250eba7c317f25ef43b9ca8458414dfb`: clean tracked HEAD context, unchanged documented Dockerfile, no stale dist overlay. Exact image transferred to guest. Owned tag removed. Clean current desktop `pnpm --silent isolated-app start --build` succeeded; own instance/profile and loopback SSH HTTP forward stopped afterward.
- **Important receipt correction:** generic helper envelope metadata in later native/preview receipts inherited the earlier Docker template. Actual native installed0036 hash, native CLI argv/source/UUID and [identity correction](evidence/api-e2e/api-rev-004/evidence-identity-corrections.json) govern those tests; no claim Docker metadata was installed for the native test. Raw receipts were not rewritten.
- Empty qualification/default engine:null/Guide unavailable remain intentional. Native amd64 engine, hosted scheduling/signing/notarization/published bootstrap remain unexecuted; compiling a candidate is not release qualification.

## Case reconciliation

| Case / boundary | Result and evidence in E4 | Limits |
| --- | --- | --- |
| N01 relevant repository | **Pass with explicit skips** narrow-checks-result.json:7 Go packages race/count1/vet;51 top-level passes; Python53enum50Pass3skip | Real Go-parent child executes; standalone child/pwsh/occupiedhost8001 skips not passes. Not whole repository green |
| V03 API-F003 FIRST | **Pass** selected-create-confirm-result.json, two-reboots-result.json | One fresh public selected create; first two ordinary whole-host reboots, no manualStart/reconnect; actual API/GraphQL/REST/mounted bytes, exact source/private/config/ID/image. Observed readiness60.879/59.991s is not a new SLA |
| V03 normal-running Stop | **Pass** normal-stop-result.json | Existing public launcherStop; ticks/publicReconnect/ordinaryboot remain stopped; no attempt rewrite |
| V03 captured failure/veto | **Pass** policy-veto-result.json | Separate controlled capture holds only own attachment job, not first-two-boot setup. Natural Docker NFS startup refusal; rawStop no-op/guidance; explicit restart=no veto persists through ticks/explicitReconnect/reboot. No synthetic State.Error/outage injection |
| V03 node restart/upgrade/current reference | **Pass** node-upgrade-result.json | Normal node restart exact preservation; public launcher upgrade-all actual replacement then ordinaryboot currentID recovery. Upgrade-all owns desired config/start behavior; not an opaque-alias-preservation claim for upgrade |
| V03 selected Docker-storage detach | **Pass** drained-detach-confirm-result.json | Explicitdrain; exact private/source/config, stopped unselected node, retained NFSvolume, exactattempt removal; no source deletion |
| V03 nativeLinux no-node | **Pass scoped** native-peer-confirm-result.json | Public create/reconnect; actual corrected packages/nonroot/defaultY/rootbinary/modes/job/source. Initial dpkg absence guard was misquoted: do not credit fresh package-absence proof. No manual host-engine install sequence; independent first-use API003 evidence retained |
| V03 nativeLinux selected client | **Pass** native-client-v2-result.json, native-detach-result.json | Normal public detach/recreate changing selected set preserves same sourceUUID; current client/image/private/config; final draineddetach. No additional native-selected whole-host reboot this round |
| V01 nativeMac | **Pass** mac-native-result.json | Fresh one-shot create under077, source/mounted identity/bytes/UUID, rootprivate modes, runninglaunchd; ordinaryboot automaticremount, normalReconnect, drainedDetach/sourcepreservation. No DockerDesktop/physical qualification |
| V02 independent peer | **Blocked** native-peer-confirm-result.json | Mac-to-Linux ordinary VM NAT TCP2049 unreachable/incompleteARP. No mount on known unhealthy route; no hostbridge/router/firewall/ARP workaround authorized |
| V04 healthy desktop/static/media | **Partial Pass** desktop-validation-result.json; image-proof2/video-proof/audio-proof/pdf-proof/markdown-proof/html-proof4; preview-http-current-contract-result.json | Actual isolatedMac remote node: PNGdecode, audio/video timeadvance, PDFraster, Markdown, HTMLrelativePNG/CSS, exactHTTP/static bytes/MIME, GraphQL. Operator fixtures, not agent-completed artifacts |
| V04 sourcechange/unsaved buffer | **Partial Pass / latency Fail** desktop-unsaved-reload-proof2.json, desktop-changed-notes-proof.json, preview-external-change-result.json | Late hide/reopen refresh shows tree/current source content, unsaved buffer preserved before deliberate discard. Synthetic browserEditContext input, not app-model writes. No auto watcher event observed; initial5s visibility fails |
| V03/V04 healthy visibility | **Fail API-F004** visibility-repro-result.json | Two unique1024-byte sourcefsync/close modifications; fresh nativeNFS + actualDockerHTTP olduntil61.149/60.975s |
| N02–N04 carried | API001/003 relevant server/REST/AGY/Guide/terminal/API/PTY/Git/lock evidence retained, not rerun | Prior mocked/scripted and same-kernel evidence not promoted to full physical/runtime proof |
| V05 / rest of full matrix | **Not Tested or dependency-limited** | Actualnative tools/unread linkedassets/peerclose/restore/Standalone-Team-Org/completedartifact; MacmanagedDocker clients; physical/independentpeer/allmode matrix remains |

### Prior-failure resolution

[prior-failure-resolution.json](evidence/api-e2e/api-rev-004/prior-failure-resolution.json) indexes the fresh selected create/two ordinary boots and Stop/veto/upgrade/detach proofs. API-F003 is **resolved at independently executed Linux arm64 Docker-storage/client scope**. Correct immutableID and source/private bytes survive, no repair disguised as automatic recovery. First2boots are untouched normal startup; later control's explicit job hold/policy restore/Start are separately labelled and never counted as automatic first2boot proof. API-F001 nativeMac and API-F002 freshUbuntu public scopes remain resolved, not generalized to untested modes.

## API-F004 — healthy committed-file visibility exceeds5s

**Expected:** AC-003 / REQ-004 / QR-001 / SCN-002: after successful sync/close of<=1MiB data, fresh opens on participating clients return exact committed bytes within5s. Local source-folder editing is an ordinary supported writer; no already-open-reader guarantee is assumed. Related AC-010 preview staleness is observed, not a separately proven renderer defect.

**Actual environment:** fresh public native setup then public selected managed-client admission. StorageUUID `982e2025-961c-4b25-ab83-24ff06debcfa`; source `/home/admin/ab-nfs-api004-linux-9591ce1a-native-source`, unchanged original identity `64769:2359328:1000:109:755`; mountedroot `/Volumes/autobyteus-shared`. Selected ID `c40d2221e0c821ea1a2c44cc9eba5c0fdf3a67179adeca98046ba7687a62a487`; full currentserver image above. Real native Ganesha/VFS4.3-8ubuntu1+autobyteus1, hardTCP4.1/actimeo1; native findmnt shows acregmin/max1 and acdirmin/max1, Docker ownedvolume includes nosharecache. Default directorydelegationsY unchanged. Actual configuration and Dockerinspect preserved in visibility-repro-result.json.

**Trigger/reproduction:** run E4/run-preview-external-change.py, then E4/reproduce-visibility.py against the owned VM. Both are executable transcripts, not mocked daemon fields. The second writes two fresh unique1024-byte files, primes native/HTTP readers, overwrites each ordinary source file, flushes/fsyncs/closes successfully, then repeatedly opens/closes nativeNFS paths and sends uncached new HTTP requests to the actual node. No live file descriptor spans the write. Commands use test-owned admin/source only; no permission/cache/kernel/export adjustment.

- Original image: expectedSHA `045559487242206fd8a52bb1aa652a1194ebc0a28a873e08ab3b6fbaa88979d0`;20 freshHTTPreads through5.010s returned oldSHA `88830f1d5e91c7ea514d2fad4c949d46b0adedd3ba20185935d4134812188919`.
- Unique file `visibility-d3f108eedd3f48ebb44f9b86c3155066.bin`: native and HTTP first exact new bytes at **61.149s**,122 observations.
- Unique file `visibility-930e44580b2c41aeaf35874512eec797.bin`: native and HTTP first exact new bytes at **60.975s**,121 observations.
- Both expected/source-after SHA `3af6dbef8362452d2b45ad97deb9e43180fb90aac309860e26e123860cce62a7`; readers previously return `785b0751fc2c53dc14a4ce3d800e69ef9ce1009eb327ccf458afe09c242c26c9`. Sourcefile inode unchanged, mtimeNs changed; source/mount marker equal. All underlying HTTP requests succeed; services were active. Later freshness does **not** convert5s failure intoPass.

[Compact failure summary](evidence/api-e2e/api-rev-004/new-failure-summary.json) and raw [reproduction](evidence/api-e2e/api-rev-004/visibility-repro-result.json) contain identities, cache settings, all timestamps/hashes and exact commands. Direct native reopen independently reproduces, ruling out a renderer-only or HTTP-only explanation. This is healthy coherence, **not D001 deferred outage**.

**Preliminary origin:** Unclear, likely selected engine/cache integration. Generated Ganesha export (`internal/backend/ganesha.go`) omits Attr_Expiration_Time. Read-only matching retained source shows EXPORT_DEFAULT_CACHE_EXPIRY60 and export default inheritance (`visibility-source-clues.json`). This is consistent with the observed interval but **not causal instrumentation or a validated repair**. Do not silently set cache flags, redesign storage, add read retries, drop kernelcaches or narrow the requirement. Reviewer determines implementation/design/dependency origin. Current source is unchanged.

## Acceptance-Criteria Proof

Whole criteria judged; no user-only waiver or VM-to-physical promotion. All remain critical.

| AC | Direct evidence / remaining | Result |
| --- | --- | --- |
|001|Both nativeOS hosting and LinuxDockerstorage/client demonstrated; independent physical/shared-peer and MacDockerclient absent|Not Proven|
|002|Historical runtime/binding/scripted evidence retained; currentactual native Codex/Claude tools/assets/close/restore absent|Not Proven|
|003|E4 preview-external-change + two native/HTTP unique1024-byte repros exceed5s|**Fail**|
|004|API003 actualmountedPTY/Git/two-mount locks retained; complete peer/coordinatedGit matrix absent|Not Proven|
|005|Prior same-kernel lockcontention proof retained; independent concurrentfile participants absent|Not Proven|
|006|Currentnative/selected public identity admission passes; full realruntime admission modes absent|Not Proven|
|007|API-F003 fresh Linuxselected whole-host restart resolved; Macnative reboot pass; fullmode matrix absent|Partial proof|
|008|Actual root/nonroot/modes/selectedprivate separation pass; bothOS/physicalauthorization matrix incomplete|Not Proven|
|009|Exactselected/unselected/private/config preservation through publicsetup/reconnect/restart/detach; remainingMacDocker/rollback modes absent|Partial proof|
|010|Actual currentdesktop/static/media/latefreshreload/unsavedbuffer pass; healthyfreshnessfailure and realcompletedagent artifact absent|Partial proof, related latency failure|
|011|Docs/finalization/userverification/authorizedrelease not performed|Not Proven|
|012|Freshone-commandMac andLinuxDocker selectedsetup; native scopedregression; publishedbootstrap/fullguidedmode matrix absent|Not Proven|
|013|Actualpubliclauncherupgrade/replacement-currentref andLinuxnode admission pass; Macmanagedclient absent|Not Proven|
|014|Storage/client repeat/reboot/detach scope passes; fullOSmode matrix absent|Partial proof|
|015|OrdinaryprivateNATpeerprobe blocked; no independentsecond-computer proof|Not Proven|
|016|SR017–021 investigation/feasibility/ARCH005 authorities retained|Prior feasibility gate only|
|017|Originalinode/device/UID/GID/mode/bytes/UUID preserved through nativeMac/Linux andDockerstorage flows; fullmodepeer matrix absent|Partial proof|
|018|CurrentLinuxnative/Dockerstorage+managedclient andMacnative exercised; MacDockerclient/physical absent|Not Proven|
|019|Existingjob normalrepeat/reboots, boundedattempt/currentref recovery, Stop/veto/detach proven inLinuxscope; remainingOSclient absent|Partial proof|
|020|API003currentGuideunavailable/copydisabled/disclosure evidence retained; qualifiedpublished linkage intentionally unavailable|Partial proof|

## Confidence and broader-validation gate

| Category | Post-repository | Final | Basis / remaining |
| --- | ---: | ---: | --- |
|Requirement/acceptance proof|50%|50%|NewcriticalAC003 failure and incomplete supportedmatrix despite API-F003 resolution|
|Changed-boundary directness|50%|50%|Realroot/kernel/daemon/CLI/currentAPI/desktop; criticalnative-runtime/bothOSclient paths missing|
|Cross-boundary realism/mock gap|50%|50%|Realnative/mountedmanagedclient/renderer; independentphysicalpeers and actualruntime turns absent|
|Environment/config/identity/fixture fidelity|50%|50%|Exactcurrentcandidate/private/source proof; physical/authenticated native profiles andprivateLAN not provided|
|Failure/edge/lifecycle/recovery|50%|50%|Strongscopedboot/Stop/veto/currentref/detach gains; healthycoherencefails andcriticalmode coverage incomplete|
|User surface/browser/desktop shell|75%|75%|Realcurrentisolateddesktop media/static/unsaved/latefreshness proof; realagentcompletedartifacts/fulluserjourney absent|
|Durable regression quality/relevance|75%|75%|CurrentfocusedGo/Pythonvalid; af9f23REST unchanged; realisticcoherencegap newly exposed beyond fixtures|

Simple mean400/7 = **57.14%** at both gates; this is confidence, not a test pass rate. Same anchor scores reflect remaining critical gaps, not absence of progress. **Broader validation Required**. No percentage overrides failingAC003. Stop remaining matrix expansion for focusedfailure-origin review; later rerun this healthy visibility case first, then remaining approvedmatrix. No unsupported/contrived scenario lowers these scores.

## Harness corrections, retained risks and cleanup

Raw errors remain alongside separate corrections: startupreadiness probes; selected/unselected Mountsarrayorder; knownDocker29 Dns:null/[] and OomKillDisable:null/false default normalization (only those fields); misquoted dpkgformat guard; alreadyconfigured create correctlyrefused before normaldetach/create; draftfolder selection only materializes onlaunch so sidebarAdd used; transienttoolpanel/selector/hiddenIME click failures; source-observer fixture initiallycached; unsupported206Range assertion corrected to existing200fullstream contract explicitlypreserved byD001; genericreceipt identity envelopes corrected separately. `selected-harness-delta.json`, `detach-harness-delta.json`, `native-harness-delta.json`, `native-client-harness-delta.json`, `preview-harness-delta.json`, `evidence-identity-corrections.json` distinguish these from actualAPI-F004. No failed5s assertion was weakened or relabelled.

Remaining dependencies/questions: exacttest-owned physicalMac/Linux/DockerDesktop targets; isolatednative Codex/Claude/Grok profiles and permitted inferencebudget; usable authorizedprivateLAN/testpair. Asked explicitly, unanswered; no personalcredential read, paidturn or hostnetwork workaround inferred. Only MacDocker **storage hosting** is deferred; MacDocker clients remainrequired. Userverification and authorizedrelease remainDelivery-ownedlater. No lackofenvironment silentlywaivescriteria.

D001/DEC015 outagehardening is deferred **notfixed**; no outageworkers/probes/streamleases/cwdtrampoline/fallbackgates. IMP-D001 privatecurrentlinks/independentconfirmedSourceUpdateRemove/AGYlocal unchanged. FUP001 remainsPMcustody; historicalNuxt/Electron non-green and candidate-onlygreen distinction retained, no duplicatefollow-up/patch/notification.

[cleanup.json](evidence/api-e2e/api-rev-004/cleanup.json) is **Complete**: publicdrained nativeattachment removal asserted beforedisposal; both exactowned VMclones/processes absent, isolateddesktop stopped/data/portsreleased, ownSSHforward absent, ownhostDocker tag removed, scratch/toolchain/copies/privateLinuxcache removed. Syntheticguest source/data/authsentinels and privatevolumes retired withownedVM. PublicMaccache and all15IR005/IR007 retained files preserved (candidate hashes/sizes unchanged). The five pre-existing untracked dist trees remain present and unstaged; normal documented builds may regenerate output, so byte-for-byte nonmutation is not claimed. OrdinaryDocker buildcache/sharedlayers retained, no globalprune. Currentignoredbuildoutputs notstaged. No userapp/node/credentials/network changed.

**Route:** focusedfailure-origin review ofAPI-F004 under fresh most-specific rule; not successfultest-code review or Delivery qualification. Complete cumulative references/evidence accompany the handoff.
