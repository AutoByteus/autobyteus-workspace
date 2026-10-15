# API/E2E Execution Coverage Report — API-REV-008

## Latest authoritative result

**Pass — 95% confidence, for the user-directed command-only shared-filesystem scope. Broader validation Required and executed. Cleanup Complete.**

All **FS01–FS17** case groups pass: FS01–12 freshly executed on native-Linux (LN) and Docker-Linux (LD) storage using two generic Linux shell containers; FS13–15 proven by audited unchanged-source prior command/lifecycle/inspection evidence; FS16 fresh detach plus prior refusal controls; FS17 fresh exact cleanup. No required filesystem case remains unstarted, failing or blocked.

This is **not an application/editor/API/preview or full-platform verdict**. The user explicitly removed those from this filesystem gate and asked API/E2E to revise its own tests without contacting Solution Designer. [Recorded direction](evidence/api-e2e/api-rev-008/user-command-only-direction.json), active [ledger](api-e2e-test-case-ledger.md), [investigation](api-e2e-coverage-investigation.md). No new requirement/design/source revision or agent delegation. Historical API007 combined-scope **Fail82.14%** and API006 **Blocked67.86%** remain unchanged; [historical report](evidence/api-e2e/api-rev-008/historical-api007-report.md).

## Round meta / authority / routing

- API-REV-008, round8, personal execution; source `a3f65bfe6e7859a3167cb41013b80bc223385cfb`, inputHEAD `c01dbfdcb6032a26177a2f92bb487aa95c39d422`, branch `codex/shared-network-workspaces`.
- Technical filesystem source remains IR009/d3c88 and SR023/ARCH007. Requirements/design basis: `requirements-doc.md`, `approval-record-sr025.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`, `solution-design-handoff.md`; direct user test-surface/gate revision above is the latest validation instruction. No full original platform/app acceptance claim.
- Applicable independent reviews: `design-review-report.md`, `architecture-review-revision-record.md`; IR010 source CRR015Pass in `code-review-report.md` / `code-review-revision-record.md`. Implementation: `implementation-handoff.md` / `implementation-revision-record.md`. Delivery reentry: N/A.
- Own current artifacts: investigation, ledger, this report, `api-e2e-revision-record.md`. **Large / High / Reviewed**; proportional cumulative durable-test review **Required**, successful-output route Code Review. No immediate Delivery, merge/push/tag/release, TaskDone or user-verification claim.

## Execution basis and environment

Root `TESTING.md` / `DESIGN.md`, relevant AGENTS, NFS README/packaging and applicable test scripts govern. Investigation/ledger existed before execution and were revised before the command-only run. No durable production/test code changed in API008; temporary probes stay with evidence.

ONE owned Ubuntu24.04 arm64/ext4 VM `ab-nfs-api008-linux-0c05c8d7`, 4CPU/8GB. TWO containers `ab-nfs-api008-cmd-a` and `ab-nfs-api008-cmd-b`, generic pinned-Ubuntu command image, CMD `sleep infinity`, network `none`, no application server, editor, browser or agent. Commands run UID1000:GID109, with explicit root-mapall controls. Their bind mounts target the **actual proven native NFS mount**, not an ordinary local directory. NFS `findmnt` and each container's `/proc/self/mountinfo` verify the boundary. This intentionally shares a kernel/NFS cache; it does not qualify independent clients or external hosts.

Supported NFS `create --nodes none` establishes LN, ordinary drained `detach`, then LD on the same original nonempty source `/home/admin/ab-nfs-api008-linux-0c05c8d7-native-source`. Mount `/Volumes/autobyteus-shared`; UUID `8bab521e-5c65-4e34-a5ca-4d8d79f06367`; both connection descriptors equal. Actual selected-node management is proven separately by carried API007 inspect/config/private-byte evidence, not by treating generic containers as launcher nodes.

- Native CLI SHA256 `3944a3f0696f006ac658475ea335fcc5dd8c9bfc1195c2301ab92608de446b38`, identical API007.
- LD CLI SHA256 `79925fc8cc589f8f922b2a32111b14f1a2fa5099b1642153754e7c0db8f32661`: same source, only owned loopback engine-image metadata differs.
- NFS source aggregate `f0d71675d3d9b70d89969a8071b8de03287cff0676669ddab295f14568041c88`. Exact IR005 patched engine pair verified; `qualifiedTargets=[]`, no publication invented.
- Generic command image `sha256:b7d5b4112a5c930a8d1a313d80e1f8f3a98627aa0209c84310e35618f00b0f53`. Exact Dockerfile/identity in [command-clients-result](evidence/api-e2e/api-rev-008/command-clients-result.json); builds in [native](evidence/api-e2e/api-rev-008/build-result.json), [LD](evidence/api-e2e/api-rev-008/build-docker-result.json), [engine](evidence/api-e2e/api-rev-008/linux-docker-prepare-v2-result.json).

## Acceptance-Criteria Proof / ledger reconciliation

Evidence root: `tickets/in-progress/shared-network-workspaces/evidence/api-e2e/api-rev-008/` (E8). [Final machine-readable summary](evidence/api-e2e/api-rev-008/command-final-summary.json). Case receipts persist each command, expected/observed bytes, identity, exit status and timing before proceeding; host ledger records the case results/checkpoints. No active case remains running/interrupted. All criteria below are critical **at the stated filesystem scope**, not the application/platform parts excluded by the user.

| Criteria / behavior | Cases / final result | Direct proof |
| --- | --- | --- |
| AC001/017/018 actual same original source / mounted topology | FS01 Pass LN+LD | [LN setup](evidence/api-e2e/api-rev-008/LN-command-setup-result.json), [LD setup](evidence/api-e2e/api-rev-008/LD-command-setup-result.json); actual NFS mountinfo/marker and reciprocal nonces in command receipts |
| AC003/004 exact file bytes/operations/metadata | FS02–05/11 Pass LN+LD | [LN commands](evidence/api-e2e/api-rev-008/LN-commands-result.json), [LD commands](evidence/api-e2e/api-rev-008/LD-commands-result.json): `cat`, `printf`, `cmp`, `sha256sum`, `sed -i`, `truncate`, `mv`, `find`, `rm`, `rmdir`, `stat`, symlink/execute; exact text/empty/Unicode/spaced names/binary/1MiB, both directions |
| AC003 healthy <=5s visibility | FS06 Pass LN+LD | Same receipts:24warmed samples/mode; A→B/B→A/source→A/source→B;1KiB/1MiB/new/in-place/atomic; fresh-open exact hashes after fsync/close; maximum LN0.060970s, LD0.056318s; no cache flush/remount |
| AC004/005 concurrency/exclusive/locks/Git | FS07–10/12 Pass LN+LD | Same receipts:80overlapping independent files/mode;200atomic replacements/mode,5899LN+7132LD complete reader samples; exclusive-create exactly1winner; actual fcntl contention/release;3coordinated Git commits plus index.lock refusal/release |
| AC006/008/009 permissions/private state | FS11/14/15 Pass | Same command receipts:source UID1000:GID109 mapall, chmod/execute/EACCES/private paths; [scoped carried controls](evidence/api-e2e/api-rev-008/command-carried-evidence.json) links exact original refusal/private/config snapshots |
| AC007/014/017/019 ordinary restart/reconnect/current references | FS13 Pass (audited carry) | [command-carried-evidence](evidence/api-e2e/api-rev-008/command-carried-evidence.json): exact LN/LD ordinary boot, Stop intent, reconnect, restart, public upgrade/current replacement reference proof, with credited/excluded raw cases and build/VM IDs; NFS/launcher/server diff empty |
| AC006/009/014/017 source safety / selected-node preservation | FS14/15 Pass (audited carry) | Same carry receipt links unsafe-source/target/nonconsent refusal, real replaced inode with copied marker rejected, original restored/reconnected; actual selected/unselected launcher configuration/private-volume/source hashes. No generic-shell substitute for managed-node semantics |
| AC006/009/014/017 safe detach | FS16 Pass | [LN detach](evidence/api-e2e/api-rev-008/LN-command-detach-result.json), [LD detach](evidence/api-e2e/api-rev-008/LD-command-detach-result.json), carried no-drain/busy refusal controls. No forced/lazy unmount; source+marker retained |
| AC011 API-owned resource cleanup | FS17 Pass | [command-cleanup](evidence/api-e2e/api-rev-008/command-cleanup.json): exact resources gone; delivery/finalization remains downstream |
| Application AC010/020/agent/runtime portions; Mac/independent-client/kernel/physical/external join; publication/signing | Out of this filesystem gate / deferred, NOT Passed | Direct user direction and SR025 deferred qualifications. No new full-product qualification or live editor closure |

## Command execution / temporary scaffolding

From assigned worktree, `python3 <E8>/command-sequence.py`, then `command-sequence-resume.py` after the prerequisite correction below. Sequence: generic Docker/tool image → public LN create → `run-command-cases.py LN` → public detach → exact engine image/private CLI metadata → public LD create → `run-command-cases.py LD` → public detach → `cleanup-command-only.py`. `reconcile-command-evidence.py` independently verifies unchanged NFS/launcher/server source and exact prior successful subcases.

`guest-command-cases.py` runs ordinary Linux commands, with small Python fsync/monotonic/concurrency/fcntl helpers where `cat` alone cannot establish the property. It asserts exact hashes and negative outcomes; no application transport or mock filesystem. VM emulation and the deliberately shared client kernel are the only topology limits. No credentials, provider calls or user-owned data used. Prior actual managed-node/lifecycle evidence is carried, not rerun or falsely presented as fresh.

Representative nonempty original source, marker and ownership are directly usable, with no migration. Actual replacement/refusal/restoration and both fresh sequential storage setups preserve this. No compatibility-only fallback, legacy retention, dual reader or migration introduced/retained by this work. IR010 session-only editor persistence is outside this filesystem result.

## Repository / cumulative durable coverage

Filesystem Go/packaging/launcher repository evidence from API007 remains valid at the byte-identical technical source. Current API008 [repository-result.json](evidence/api-e2e/api-rev-008/repository-result.json) also records fresh original/viewer3files12tests, adjacent22files148tests (overlap, not160unique), both boundary guards, and real HTTP workspace-content1file6tests Pass, with exact argv/cwd/clean environment. Those application tests ran before the user revision and are supplementary, not filesystem gates. No repository command added after the command-only confidence checkpoint.

No durable test edit in API008. Cumulative proportional review remains required for:
- `autobyteus-server-ts/tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts` (`af9f23`, socket/preview contract) and its runtime test-server helper `tests/e2e/helpers/studio-runtime-test-server.ts`.
- `autobyteus-web/components/fileExplorer/__tests__/FileExplorerTabs.unsaved.spec.ts` (API007 original regression; now green).
- `FileExplorerTabs.draftViewer.spec.ts` and updated `FileExplorerTabs.spec.ts` (IR010; current repository Pass).

No tests deleted to hide a failure. Temporary executable command probes are retained with their evidence, not a new product/test-framework architecture. The separate pending-Save defect **CR-FUP002**, Task `project_task_a4f90984-add2-4300-983d-de54ded3032b`, remains unresolved/outside this increment by explicit user disposition. Keep IR010; do not claim all editor scenarios validated or reopen this filesystem verdict because of the follow-up. Original API007 live editor failure remains historical; its current-source repository correction is proven, but its live editor rerun was not reached before the user removed that gate.

## Attempts and deviations (not hidden product failures)

- Initial application-oriented preparation built a current isolated desktop and server image, then only local reader/Markdown/Guide observations. User changed the testing surface/gate. Owned desktop stopped normally, app orchestration stopped, no guest application server ever started. These observations are supplementary only; initial live-editor rows are superseded/NotTested, not Passed.
- Public Ubuntu image download first timed out900s, then was interrupted at user scope change, then resumed the exact owned cache/digest/clone. All attempts/logs retained. No second VM or host network workaround.
- First LD image prerequisite redundantly attempted to install Docker already installed; guest unattended-upgrades held dpkg's lock. Raw result Incomplete is preserved. V2 verifies installed Docker instead; no lock deletion, package-manager kill or product/source patch. [Correction](evidence/api-e2e/api-rev-008/ld-preparation-correction.json). Every LN and LD filesystem case then passed.
- Prior carry excludes raw failed harness observations (stopped runtime Ports, already-current upgrade identity overassertion, no-drain refusal wording). Exact valid continuation evidence is named in the carry receipt, never a wholesale promotion of failed raw files.

## Confidence scorecard / final gate

| Category | Command-only post-repository | Final | Evidence / residual |
| --- | ---: | ---: | --- |
| Requirement / scoped AC proof |75%|95%|FS01–17 complete fresh or exact valid carry; app/platform exclusions explicit |
| Changed-boundary directness |75%|95%|Actual NFS CLI, kernel mounts and command actors; no app/mocked filesystem |
| Cross-boundary realism / mock gap |75%|95%|Two real container processes and backing source; same-kernel limitation accepted, no independent-client claim |
| Environment/config/identity/fixture fidelity |95%|95%|Exact source/binary/image/UID/marker/namespace, no real credentials; corrected setup attempt disclosed |
| Failure/edge/lifecycle/recovery |95%|95%|Fresh negative file/permission/lock/detach checks plus unchanged actual restart/refusal/source proofs |
| User-surface confidence |95%|95%|Supported NFS command surface proven; browser/desktop application acceptance not applicable to this gate |
| Durable regression quality/relevance |95%|95%|Existing NFS/setup repository evidence remains valid; fresh command probes complete material boundaries; cumulative test review pending |

Simple average **86.43% →95%**. Every critical behavior in the user's command-only filesystem scope directly proven; no category below90%, no active blocker or material in-scope broader risk. Strong bounded proof, not universal guarantee. Same-kernel/platform exclusions remain qualifications, not fabricated Passes. No user-only dependency needed to finish this scope. Preliminary failure classification: N/A; no unresolved filesystem finding. Broader decision: **Required and executed**, not NotRequired merely because unit tests passed.

## Cleanup / finalization boundary

[Cleanup receipt](evidence/api-e2e/api-rev-008/command-cleanup.json): LN+LD safe public detaches and preserved original source/marker proven before disposable VM retirement; exact command containers/guest registry/storage/images/private cache/VM/clone/scratch/toolchain removed; unused host application image tag removed. Earlier isolated desktop stopped without force, owned data root removed, ports64733/64734closed. Prior public Mac cache/IR005 engine files and five preexisting SDK/dist trees preserved; global Docker build cache not pruned. No user app/node, credential, hostbridge/firewall or paid resources changed.

No required API-owned work remains for this filesystem validation round. Fresh handoff rules select the proportional successful-test review route; review/Delivery finalization and any authorized release remain separate gates.
