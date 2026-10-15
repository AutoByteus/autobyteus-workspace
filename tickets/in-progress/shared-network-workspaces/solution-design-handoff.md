# Solution Design Handoff — SR023 / Architecture Design Complete

## Request, approval and classification

**shared-network-workspaces / AutoByteus NFS**, Task
`project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63`. Solution Designer
`/software_engineering_team/solution_designer`; original requester `/project_task_manager`,
AgentRun `project_task_manager_a5f6d9d306e54970bafdad895bdf731d`.
**Ready SR023 / unchanged Approved SR018 / Large / High / Reviewed route.**
Current recovery **CRR012 / CR007 P1 / API-F005**; personal work, no delegation/spawning.
Request independent architecture review of the bounded source-identity/persisted-intent
delta before dependent implementation, not repeat full score/audit or forward directly API.
No new question/approval hold: approved normal Mac restart, replacement refusal and all
source/privacy/permission constraints stay unchanged. No Product UI/UX change.

Original outcome: one easy install/start per computer creates or joins persistent shared
storage at `/Volumes/autobyteus-shared` (projects below); native Mac/Linux and selected
managed Docker clients use ordinary project/file/native-tool IO on the actual chosen
source, not a copy/proxy. Persistent status/restart/reconnect/safe detach and exact source/
node/private-data preservation; narrow Nodes NFS Guide, healthy previews and current
private skill/runtime behavior. Git remains compatibility workload, not sharing mechanism.

## Incoming failure, preserved authorities

Read CRR012 canonical report/history and E12 source/mac/visibility/contracts/limits plus
current requirements/approval/design/history before action. Incoming review
**342572f01969a2253785281df3764f3add6ffa7c**, receipt/input HEAD
**b562a3a8a1d9fcbff024ba039363f3db15f7f08a**, API005
**190e130290ca74307430fac6b28f0bc736766033**, unchanged production
**d65aeda24fc4b9a534a3941b194dd4a55b88c00c**. Prior ReadySR022 / ARCH006 / IR008.
**CRR012 Fail / API005 Fail57.14% / broader Required** remain current specialist verdicts.
CRR011100/100 is historical source-only, not current package/product Pass.

SCN009/012/013 / BEH001/004/005 / REQ014/017/019 / AC007/014/017/018/019:
completed nativeMac public create -> same-host ordinary boot -> same original project
available automatically without manual mounting. API005 raw device16777228 became30/27/30
across three ordinary boots; inode506781, UID501/GID20/mode755/bytes/marker and actual APFS
VolumeUUIDA19FE379-BE62-4297-9A39-3934CC88214B unchanged. Saved pair stayed28/506781;
launchd/service -> Reconnect -> CheckSource refused BEFORE Apple Ensure/mount. Two public
reconnects likewise failed. No data loss/false-ready observed;210s is observation not SLA.
Design had persisted full dev+inode; source implements it. Not an IR008 regression,
peerNAT, unsupported filesystem, API-F001 reopening or request for generic retries.

## Chosen smallest design / boundaries

- Existing platform/config/setup owners: persist Mac **APFS VolumeUUID + directory inode**;
  keep Linux device+inode semantics. Tight backend-selected variant; complete validation,
  no extra schema/platform tag. Raw Mac dev only correlates a single observation, never
  saved equality or a field updated after boot. Marker remains separate required storage UUID.
- Existing canonical/nosymlink/path/privacy checks, opened directory fd/Fstatfs localAPFS,
  actual mounted device -> trusted Runner `/usr/sbin/diskutil info -plist <device>`.
  Bounded typed XML with actual VolumeUUID/DeviceNode/MountPoint/FilesystemType, duplicate/
  malformed/mismatch refusal; recheck path/fd mapping. No guessed device, directory query,
  Mounted key (not present), DiskUUID/containerUUID fallback, shell/cgo/new user dependency.
- Current Apply/Plan/Pending/CheckConfiguration/Reconnect sequencing only: complete binding
  validation, first-created source captured once and bound intent saved before later
  marker/handle/export effects. Complete pending binding compared/reused even if stale
  NewSource; truly zero unbound intent distinct; old/partial/mixed/hosted-unbound inconsistency
  refuses. No mismatch rebind or automatic migration. Existing supervisor cadence and pending
  recreation consent stay. Status no repair; detach no new live-source availability gate.
- Data evidence: no supported released predecessor established by local refs/source/empty
  qualification and actual known installed fixture records; not a global absence claim.
  Old Apple device-only bound state cannot infer original UUID. Matching-old-candidate
  public drained detach BEFORE installing corrected candidate, then fresh create on preserved
  source/marker for unqualified owned fixtures. Linux/currentApple bindings directly usable;
  genuinely unbound new-source intent is not an established binding. Unknown supported retained
  install -> return evidence before cutover, not a speculative migrator or deletion.
- No change to original source bytes/storage UUID, public attachment/private state, hard mount
  policy, OS privacy/nonroot refusal, Apple startup correction, Ganesha expiry0/engine,
  Docker restart/Stop controls, runtime profiles, REST/UI or release authorization. No generic
  watcher/proxy/retry/supervision/command-runner framework. No stronger anti-cloning/hostile
  admin security guarantee: bitwise volume clones can preserve UUID; normal replacement
  controls remain required. Current design-spec.md is the technical authority.

Concrete delta files: NFS config/state.go (+cohesive source_identity.go optional), platform/
source.go and new source_darwin.go/source_linux.go, setup plan/apply/pending/lifecycle wiring,
adjacent config/platform/setup tests, README. Production implementation remains downstream.
Remove full cross-OS raw-device equality and complete-pending recapture, not Linux guard.
Regenerate CLI/source metadata normally, reuse exact engine pair; no engine rebuild.

## New evidence and truthful limits

E23=`/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/evidence/design-recovery/sr023`.
Start source-identity-investigation.md, primary-contracts.md, persisted-state-evidence.json,
prototype-result.json, cleanup.json and final-audit.json. Full commands/errors and probe source
retained. One owned isolated macOS26.6.2/25G83 arm64 public clone, no product installed,
no host shares/credentials/user apps. Go no-cgo dependency probe compiled arm64+amd64 (ONLY
arm64 ran). Three normal guest boots changed rawdev29->30->30->28 while UUID/inode507377,
original bytes/marker/UID/GID/mode stayed. Same-path replacement directory inode514448
rejected by candidate; original restored. Two actual APFS volumes at SAME mountpoint,
rawdev16777241 and inode2 with identical marker/content had different UUID; candidate
rejected second, accepted original reattach. Leaf/ancestor symlink and unreadable nonroot
helper controls refused.11observations. This is **dependency feasibility**, NOT corrected
public product/automatic mounted read-write/API/managedDocker/physical qualification.

Exact own disk images detached, clone/PID/compiler scratch removed, public baseline/tool
cache retained: cleanup Complete. Failed Python3.9 tar extraction, top-directory archive
guard, unexported constant build, and escaped-JSON cleanup assertion retained in attempts
and separate attempt directories; later checks resolved them, not hidden successes.
No product/root host NFS/provider/app operations, production/durable-test edits or full
suite rerun. Cumulative1302 incoming refs retained plus E23;1298 protected-authority hashes,
286 prior untracked dist files and prior solution-history prefix checked by final audit.
Upstream CRR012's19candidate audit remains inherited evidence, not a new designer rehash
claim for binaries outside this round's manifest. No cross-build byte-identity claim.

## Prior scoped closures / remaining gates

**CR006/API-F004 independently scoped RESOLVED** API005: Linux native and Docker STORAGE;
40unique1KiB/1MiB fixtures80native+actualmanagedHTTP checks all<=5s after flush/fsync/close;
12warmed-inplace+4atomic+4new per storage across fresh public create/reconnect. Max native
storage0.927933/HTTP0.934914s, Docker0.827498/HTTP0.839105s; actual fresh activation/config/
source/private proof. Not fullbothOS/physicalAC003. Keep CR005/API-F003 scoped normalboots
71.368/62.573s (not SLA), no manualStart/reconnect; separate normalStop/policy-no/replacement/
detach controls. SameID/Image/Config, HostConfig only recorded DNSnull->[] normalization,
not raw equality. CR001–004 scopes retained. Do not reopen these fixes because CR007 fails.

After accepted design: implementation -> selected independent source review -> **API-F005
FIRST** with current PUBLIC nativeMac create, >=2ordinary wholehostboots and witness real
device reassignment (additional boot if needed), automatic mounted nonroot read/write,
actual samevolume/directory/bytes/marker/modes/private config, then separately public
reconnect and real directory/volume replacement refusal controls. No synthetic identity
edit, marker-only workaround, manualmount/repair or standalone helper substitutes.
Proportionate Linux freshness/reboot/Stop regressions then remaining bothOSnative+managed
DockerCLIENTS/Linuxnative+DockerSTORAGE/independentphysicalpeer/actualnativeTools+unread
linkedassets+peerclose+restore/Standalone-Team-Org/completedartifact+healthy previews/
hostedworkflow-signing-amd64engine-publicbootstrap/docs/user/finalization/authorizedrelease.
Successful af9f23 RESTtest-code review still awaits PassedAPIpackage.

D001/DEC015 advanced outage isolation deferred **NOT fixed**. IMP-D001 private current
links, independent confirmed Sources Update/Remove and unchanged AGYlocal remain; no
pin/refcount/retention. FUP001 remains PMcustody, no duplicate follow-up. Only MacDocker
STORAGE deferred, not Macnative reboot or DockerCLIENTS. PeerNAT limitation and unanswered
physical/profile/inference/privateLAN prerequisites unchanged; no permission/waiver inferred.
No merge/push/tag/release/TaskDone/user-verification claim. Delivery artifacts N/A—not yet.

Retained exact API005 identities: defaultaggregate
`ae8e023775c9f7ab060e469cc9770a34ccc1321a8ae9d338a95a70ae0cd15076`, sameengineaggregate
`a6ef7dee582e9b4ba0edd7449bac4d292acfb944073502f0fb63bd8356653342`;
LinuxCLI`32772499817bccc6dc8c8bd01b15a457457848e17321af6053544adf53803a64`,
MacCLI`5908c8229010102d7a1708c65e50b8674766a6c8356c4362588c0fed36167a57`.
Actual API005 Dockerstorage`46e746888f36ce8c46a2710dcc18616f87bfe95cd6cacc8ba7c7daf38437ea3b`,
CLI`d9ba0370c10d1fb7c39ae70970e5407563d6cf5595afc718de601b5bf771ed6f`,
serverimage`3ebc66f53aa2c3bbd3b6802ad2d4b1ade5f582510ecffaaddbce15d3b3ed0bb4`.
IR005engine pair/source reused NOT rebuilt, qualification empty; no hosted/signing/amd64/
publicbootstrap claim. Specialist reports and all raw failures stay authoritative.

## Workspace, canonical package and expected output

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces`,
branch `codex/shared-network-workspaces`; base
`origin/personal@f13bdd0eb79aacc63dffa5995b9c86f359001468`; finalization `origin/personal`.
All canonical ticket files under that worktree's `tickets/in-progress/shared-network-workspaces`:
requirements-doc.md/approval-record-sr018.md (unchanged), investigation-notes.md,
design-spec.md, solution-revision-record.md, this solution-design-handoff.md, all linked
supplements and independent reports/histories. E23/package-index.json is the complete
cumulative absolute reference list, including all1302 incoming paths. Prior canonical
SR022 design/handoff/history snapshots retained.5 old untracked dist trees untouched/unstaged.
No integration-checkout edits. No competing requirements/design authority.

Expected reviewer output: proportionate independent assessment of persistent identity
semantics, trusted actual-volume capture, safety refusal, pending bind-once sequencing,
evidence-based state disposition and API-F005-first obligations. Apply configured route
on outcome; an informational Pass notice to Solution Designer does NOT trigger duplicate
implementation forwarding. This handoff does not authorize review bypass or public release.

## Routing

Full result persisted before fresh rule lookup. Route selection recorded below after lookup;
no duplicate implementation/API/PM dispatch, no delegation or new Task.

SR023 fresh-rule routing2026-10-15: completed Large/High architecture package with unchanged
ApprovedSR018 selects ONLY `/software_engineering_team/architecture_reviewer`. Direct Low-risk
implementation and delivery-receipt conditions do not apply. Full cumulative reference package
and the same absolute solution-design-handoff.md accompany the message. No duplicate
implementation/API/PM forwarding or delegation. Dispatch success is asserted only by the
send_message_to confirmation, not by this pre-dispatch route record.
