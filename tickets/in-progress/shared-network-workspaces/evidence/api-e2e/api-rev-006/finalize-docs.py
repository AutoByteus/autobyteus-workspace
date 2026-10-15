from pathlib import Path
import json,hashlib,subprocess as sp
R=Path.cwd();E=Path(__file__).resolve().parent;T=E.parent.parent.parent
j=lambda n:json.loads((E/n).read_text())
assert j('cleanup.json')['result']=='Complete'
inputs=j('input-audit.json');mac=j('mac-native-result.json');vol=j('mac-volume-result.json');lin=j('linux-native-result.json')
env={'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','PYTHONDONTWRITEBYTECODE':'1'};checks=[]
for name,args,rc,expected in [('default-source-hash',['--source-hash'],0,'cc3556ce850bf20281e6b7e0411a6b01359ea863cac6cb22104808e9dc225354'),('same-engine-source-hash',['--source-hash','--engine-manifest',str(R/'autobyteus-nfs/out/ir005-local-candidate/engine-candidate/engine-manifest.json')],0,'f0d71675d3d9b70d89969a8071b8de03287cff0676669ddab295f14568041c88'),('unqualified-publication-refusal',['--check-publish'],1,'No qualified release targets')]:
 a=['python3','autobyteus-nfs/packaging/release.py',*args];p=sp.run(a,env=env,capture_output=True,text=True);q={'name':name,'argv':a,'cwd':str(R),'environment':env,'rc':p.returncode,'stdout':p.stdout,'stderr':p.stderr};checks.append(q);assert p.returncode==rc and expected in p.stdout+p.stderr
(E/'final-source-check.json').write_text(json.dumps({'result':'Pass negative release gate only','commands':checks},indent=2)+'\n')
text='''# API/E2E Execution Coverage Report — Shared Network Workspaces

## Latest authoritative result

**API-REV-006 / Round6: Blocked — external validation dependencies. Confidence67.86%. Broader validation Blocked.**

**API-F005 / CR007 resolved at executed nativeMac scope:** current public create, two ordinary whole-host boots with actual raw-device reassignment, automatic mounted nonroot read/write before any manual reconnect, unchanged saved APFS UUID+inode binding, separate public reconnect, and actual directory/APFS-volume replacement refusal. No new established product failure. This is not complete product qualification or release readiness.

The first two boots observed automatic mounted IO at50.568/50.053 seconds (observation times, not an SLA). Real replacement APFS volumes had **the same raw device16777241 and inode16**, but different actual UUIDs: original4BAA1B01-8089-4F31-A0EB-C9803B59C828 versus replacementCF81E8A8-2593-44CF-99D6-0E53A04FB4B9. Copied marker and content did not bypass refusal. Restoring the exact original volume restored public reconnect and mounted IO without editing identity.

## Round metadata, authorities and routing classification

- Task `project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63`; **Large / High / Reviewed**. Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces`; branch `codex/shared-network-workspaces`, finalization `origin/personal`.
- Input HEAD `eb7a8894fccf6316192a6f84851d43d553b99055`, review1906e5c070b339d78b0dfcebdf2c5349b0c8dd6c, implementation-source d3c88f37c30ee74a89a95a4f6906992667c9b875, IR009 handoff2dfcffbb2fb7df6dfa8d2a672f6c5f3f7690b304. ApprovedSR018 unchanged / ReadySR023 / ARCH007 / CRR013 source Pass. Source100/100 is not execution confidence.
- Authorities: [requirements](requirements-doc.md), [approval](approval-record-sr018.md), [investigation](investigation-notes.md), [design](design-spec.md), [solution history](solution-revision-record.md), [solution handoff](solution-design-handoff.md), [architecture review](design-review-report.md)/[history](architecture-review-revision-record.md), [implementation](implementation-handoff.md)/[history](implementation-revision-record.md), [source review](code-review-report.md)/[history](code-review-revision-record.md), full relevant supplements in cumulative index.
- **E6** = [evidence/api-e2e/api-rev-006](evidence/api-e2e/api-rev-006/). [Package index](evidence/api-e2e/api-rev-006/package-index.json) retains all1488 incoming references plus new evidence. [Coverage investigation](api-e2e-coverage-investigation.md), [ledger](api-e2e-test-case-ledger.md), [revision record](api-e2e-revision-record.md) remain canonical. API001–005 historical Fail results and raw attempts remain unchanged; this is the latest completed round.
- Trigger: code_reviewer CRR013 source Pass; prior API005 Fail57.14%. Personal execution, no delegation. No production or durable-test changes. Cumulative af9f23 REST tests remain attached and await proportional successful-test review after a **Passed** API package. This Blocked package does not trigger successful-test review or delivery. Product supplement and delivery report/revision **N/A—not applicable/not yet performed**, not missing selected source/architecture reviews.

## Investigation, coverage validity and method

Investigation/ledger initialized before execution and updated before each validity correction. Root AGENTS/DESIGN/TESTING, NFS README/packaging instructions, SR023/IR009/CRR013 boundaries and persisted-state decisions read; no closer NFS guideline. Existing config/plist/correlation/pending/binding and REST tests **Still Valid**; none removed. OS whole-host boot, trusted diskutil, real root/nonroot creation, mount, source replacement and public detach need **temporary executable probes**, not mock promotion. Exact commands/environment/output in E6 scripts and JSON receipts. Repository race/vet/packaging preceded broader execution; post-repository confidence57.14%, broaderRequired.

Actual Mac/Linux guests use pinned public images, isolated clean environments and test-owned files, no host shares/audio/clipboard/USB. Kernel NFS, sudo, launchd/systemd, trusted installed diskutil, actual source/mount/marker and CLI are real. VM hardware is emulated; this cannot satisfy independent physical-computer acceptance. No user host mount/config/service/app/node changes, personal credentials or paid inference. No browser/desktop run this round: no renderer/shell delta in IR009; prior API005 Guide and API003/004 preview evidence retained at original scope. Complete native-agent and artifact-preview matrix remains open, not replaced with operator files.

### Compatibility / persisted-state check

IR009 Legacy/Compatibility and Persisted Data Transition sections reviewed. No compatibility-only branch/test, dual reader, schema upgrade, marker fallback or migration added. Current Mac UUID+inode / Linux device+inode records directly reused through ordinary public readers. All old API005 disposable VMs were already publicly detached/retired; no old device-only installation was overwritten. A future retained old test installation must drain/detach using its matching old CLI before current fresh create, preserving originalsource/marker/UUID. No supported released predecessor established; not universalabsence. Contrary supported-deployment evidence must return upstream, not trigger invented migration or identity rewrite. No such deployment found here.

## Current platform and build identity

- Mac `ab-nfs-api006-mac-a0000f39`, actual macOS Tahoe arm64/APFS,2CPU4GB, native Apple NFSv3/TCP, user501:20. Linux `ab-nfs-api006-linux-4fdb190d`, Ubuntu24.04.5/ext4/kernel7.0.0-38/arm64,4CPU6GB60GB, actual nonroot1000:109 with cleared supplementary groups, hardTCPNFS4.1 and default directory-delegationsY. Exact image pins/OS/argv in mac-peer-resource.json, linux-resource.json/linux-start.json.
- Current MacCLI SHA256 `c79e5ac05367d6657bc0be74f2e8f5b9eb504af8ade265e1afdf0334218d0cf1`; independent current Linux build `3944a3f0696f006ac658475ea335fcc5dd8c9bfc1195c2301ab92608de446b38`, exactly matches retained IR009. Own checksum-verified official Go1.27.2; only owned source copy receives build metadata/assets. Current default source aggregate `cc3556ce850bf20281e6b7e0411a6b01359ea863cac6cb22104808e9dc225354`; exact retained-engine metadata aggregate `f0d71675d3d9b70d89969a8071b8de03287cff0676669ddab295f14568041c88`.
- Engine NOT rebuilt: exact IR005 package pair main0b5c78911cfc1b299e9894e1f841e74176fbb2cb45b158008e4530713549ebc8 / VFS3bf06769646d93ea85f0277fe0726eb42d0d29a70c0108505706954e5e8d2ac6; sourceeed35ab4b732ac05d2afc3531e70cdc27031fb414fdb52a0daf093f33daaec0a. Native actual installed package4.3-8ubuntu1+autobyteus1 verified. No current-round Docker image identity assigned; prior API005 identities are historical only.
- Empty qualified-target publication refusal reconfirmed in final-source-check.json; no signing/notarization/hostedworkflow/public-bootstrap/amd64-engine execution or release claim.

## Ledger / changed-boundary reconciliation

Cases recorded as they ran with durable checkpoints. Generic inner `case:Pass` labels sometimes mean command success only; semantic assertions and final reconciled results below govern. Raw failures/incomplete Running receipts remain explicitly superseded by their named confirmations, not silently rewritten. No case is still running after cleanup.

| Case / critical boundary | Result and evidence (E6) | Proof and limit |
| --- | --- | --- |
| N01 current repository | **Pass with skips** narrow-checks-result.json, test-counts.json, go-race.log, go-vet.log, python-bootstrap-launcher.log |7Go packages,70topPass+1standalonechildSkip,212directsubcasePass. Deeper4printed passes are child transcript, not extra suite cases. Parent executes child. Python53enum50Pass3Skip: standaloneGochild, missingpwsh, host8001occupied collisionfixture. Not whole-repo green |
| V01/API-F005 first gate | **Pass** mac-native-result.json, prior-failure-resolution.json |Fresh public create under077; two distinct ordinary boots; actual rawdevice16777228→16777229, originalinode507558/owner/mode/bytes/marker/UUID unchanged. Automatic mounted read/write before manual reconnect; installedCLI/private0700/0600/launchd/export/settings captured |
| V01 separate reconnect | **Pass** mac-native-result.json |Public reconnect after both automatic boots, exact savedbinding bytes unchanged; not manual repair counted as automatic |
| V01 replacement directory / symlink | **Pass** mac-controls-result.json (first controls), mac-controls-confirm-v2-result.json |New actual directory with copiedmarker/content refused; symlink refused; exact originals restored by rename and public reconnect; no identity edit |
| V01 permission/privacy | **Pass scoped** mac-permission-observation.json, mac-controls-confirm-v2-result.json; mac-new-source-result.json first controls |Actual denied nonroot source/mount access -> publicstatusfalse/reconnectrefusal. Home/privateauth tree/symlinkancestor refused before setup. Normal permission propagation settling, not instantaneous-chmod guarantee |
| V01 actual new source / absent-source detach | **Pass** mac-new-source-resume-result.json create/binding + mac-new-source-confirm-result.json |Public absent-source child creates owner501:20/private0700; final UUID+inode bound record, no pending, mountedRW/reconnect; source renamed absent then safe detach still works; exact original restored/preserved. Mid-apply ordering comes from unit evidence, not instrumented product crash |
| V01 actual APFS volume replacement | **Pass** mac-volume-result.json |Same path/rawdevice/inode, different real UUID, identical marker/content -> public refusal and binding unchanged. Exact originalvolume restored -> public reconnect/RW; publicdetach preserves bytes/marker/modes; owned diskimage detached. Separate reboot/manual imageattach is replacement setup, not automatic image-mount qualification |
| V03 Linux native binding regression | **Pass scoped** linux-native-result.json + linux-native-resume-result.json |Fresh no-preinstalledengine public create/actual install/device+inode record; mounted nonrootRW, ordinary boot distinctID/automaticRW before reconnect; later separate reconnect, real copiedmarker replacementrefusal, exactrestore and safe detach |
| V03 Linux new-source lifecycle | **Pass** linux-new-source-result.json create + linux-new-source-confirm-result.json + linux-new-source-detach-result.json |Actual public newsource1000:109/private-group0750, exact device/inode binding/no pending; mountedRW/reconnect; absent live path safe detach; originalinode/modes/bytes/marker preserved |
| V02 independent network/physical | **Blocked** peer-network-confirm-result.json, linux-new-source-detach-result.json beforeDetachNetwork, blockers.json |Macguest TCP22 timedout/TCP2049 no-route; Linux actual2049listener/selfconnect and services healthy. No tunnel/bridge/firewall workaround applied. SamehostVMs never physical proof regardless of transport |
| V05 native runtime/full scenarios | **Blocked dependencies / Not Tested current** blockers.json |No approved isolated authenticated Codex/Claude test profiles/inferencebudget; no current native-tool/unreadasset/peerclose/restore/Standalone-Team-Org/completedartifact proof. Scripted/operator tests not substitutes |
| V04/remaining managed-client/storage/UI/release matrix | **Not Tested this round** |Current Macmanagedclients, complete preview/artifact matrix, amd64engine/hosted signing/bootstrap remain open. Not all individually declared impossible; schedule remaining feasible work with resumed integrated validation. Only MacDocker STORAGE deferred |

Exact repository commands are in run-narrow-checks.py/narrow-checks-result.json: own pinned Go `test -race -count=1 -v ./...`, `vet ./...`, selected Python unittest modules. Actual runtime commands include `create --source ... --backend apple|ganesha-native --endpoint <privateIP> --allow <privateIP> --nodes none --yes --json`, separately `reconnect --yes --json`, ordinary OS reboot, and `detach --yes --drained --json`; exact argv and clean HOME/PATH retained. Later repository checks only source hashes/publication refusal and artifact/syntax audits; no whole-suite claim.

## Prior failure resolution and carried scope

[API-F005 resolution](evidence/api-e2e/api-rev-006/prior-failure-resolution.json) records original source VolumeUUID A19FE379-BE62-4297-9A39-3934CC88214B, storageUUID4ff085b0-3304-4023-a5c2-9834e38aec72, savedbinding SHA7191d83482d19fc1ccc9c8c472454c445bd744a589a0d5e7b765754270550693. Boot IDs AF4F68C7-F354-42B5-90E9-1CA4B7FFD6A2 →0B4C3F0C-A620-4020-A8D8-03B7D5E87AFC →193F98DC-86D8-4827-B479-69948ACC75DF. Both automatic IO checks precede the first explicit reconnect. Real replacementvolume proves UUID matters even with equal rawdevice/inode. No dropped protection, copiedmarker fallback or artificial stat mutation.

API-F004 independently resolved in API005 Linuxnative/DockerSTORAGE + native/actualmanagedHTTP:40fixtures80reads≤5s, worst0.935s afterflush/fsync/close, not LLM time. API-F003 ordinaryLinuxboots/separateStop/policy/currentref/replacement/detach resolved scope retained, sameID/Image/Config with documented HostConfig emptyDNSnull→[] normalization, not raw equality. API-F001firstMaccreate/API-F002firstnativeUbuntu and CR001–004 scopes retained. IR009 changes neither engine/cache/backend nor REST/UI/runtime behavior; no new full Docker or UI rerun claimed. Historical API003/004 mounted API/PTY/Git/lock/desktop media/unsaved-buffer and native feasibility remain original scope, not expanded into current physical/native-agent proof.

## Acceptance-Criteria Proof

Whole criteria, not only repaired subcases. Critical **Yes** for all mandatory ACs; no `Only The User Can Check` waiver. E5 denotes prior-round evidence/api-e2e/api-rev-005, carried explicitly.

| AC | Critical | Cases / evidence and remaining proof | Whole criterion |
| --- | --- | --- | --- |
|001|Yes|V01/V03 current native mounts; E5managed clients; V02independentphysical/bothOSclient missing|Not Proven|
|002|Yes|Historical native feasibility/scripted transport; V05current native tools/roundtrip/unreadassets missing|Not Proven|
|003|Yes|E5visibility-result/docker-visibility-result80reads≤5s; fullbothOS/physical clients absent|Not Proven; prior Linux failure resolved|
|004|Yes|E5file-operations/mounted-api and priorlock/Git; independent coordinated clients missing|Not Proven|
|005|Yes|E5different-file concurrency; physical independent participants absent|Not Proven|
|006|Yes|V01/V03 wrongsource/privacy/permissions; complete currentruntime admission matrix absent|Not Proven|
|007|Yes|V01API-F005resolved, V03nativeboot/reconnect; E5nodeboots; fullcrossnode roundtrip absent|Not Proven; Mac defect resolved|
|008|Yes|V01/V03actualroot/nonroot/modes; E5privateclient preservation; full authorizedOS/physicalidentity matrix absent|Not Proven|
|009|Yes|V01/V03publicdetach/absentsource preservation; E5selected/unselected lifecycle; completeMacmanaged matrix absent|Not Proven|
|010|Yes|Prior API003/004 healthy previews/E5mountedHTTP; no current native completedartifact/fullpreview proof|Not Proven|
|011|Yes|Docs/userverification/finalization/authorizedrelease downstream, not performed|Not Proven|
|012|Yes|V01/V03freshcurrent publiccreate; publishedbootstrap/fullguidedmatrix absent|Not Proven|
|013|Yes|E5actual Linux launcher admission/upgrade; Macmanagedclient incomplete|Not Proven|
|014|Yes|V01/V03repeat/reboot/detach nowpass; fullmanaged/independentclient scope incomplete|Not Proven|
|015|Yes|V02physical dependency and currentguest network probe; independent two-computer proof absent|Not Proven|
|016|Yes|ApprovedSR018/ReadySR023/ARCH007 cumulativefeasibility gate; not fullproductexecution|Proven prior feasibility authority only|
|017|Yes|V01/V03originalsource/private binding/marker + realreplacementrefusal; fullsupported matrix incomplete|Not Proven as whole matrix|
|018|Yes|V01Macnative/V03Linuxnative; E5Dockerstorage; Macmanaged/physical incomplete|Not Proven|
|019|Yes|V01Macautomaticboots and V03Linuxnativeautomaticboot, E5managed lifecycle; complete matrix absent|Not Proven|
|020|Yes|E5desktop-guide-proof currentunchanged disabledunqualifiedlinks; qualified published flow absent|Not Proven as shipped flow|

## Confidence and broader-validation decision

| Mandatory category | Post-repository | Final | Evidence gain / remaining uncertainty |
| --- | ---: | ---: | --- |
|Requirement and AC proof|50%|50%|Mac defect closed; criticalphysical/nativeagent/fullmatrix still missing|
|Changed-boundary execution directness|50%|75%|Actual privileged setup/kernel/volume/boot now exercised; fullcrossclient/runtime paths incomplete|
|Cross-boundary realism/mock gap|50%|50%|RealOS/mounts but critical independentphysical/nativeauthenticatedruntime missing|
|Environment/config/identity fidelity|50%|75%|Exact installed bytes/savedbinding/realUUID/inode/rawdev and restored originals; hardware/LAN/profiles absent|
|Failure/edge/lifecycle/recovery|50%|75%|Mac2boots/replacement/newsource/privacy plusLinuxregression; complete client matrix incomplete; no deferred outage claim|
|User-surface/browser/desktop shell|75%|75%|NoUI delta; historicalactualguide/previews retained; completecurrent nativeartifactjourney absent|
|Durable regression relevance/quality|75%|75%|ValidGo/Python/REST, current tests pass; realOS boundaries temporary, RESTsuccessreview stillheld|

Simple mean475/7 = **67.86%**, up from400/7=57.14%; not test pass rate. Allcategories<90, target≥95 notmet. Missingcriticalproof independently blocksPass. Broader initially **Required**, final **Blocked** for exactexternaldependencies below; localcurrentdelta checks completed, not all future feasible matrix checks attempted. No automatic target reduction or user-only exemption.

### Exact blocker and resume requirements

[blockers.json](evidence/api-e2e/api-rev-006/blockers.json): authorized disposable physicalMac and Linux hosts with a Docker participant and permitted private-LAN NFS/admin access, plus isolated authenticated Codex/Claude testprofiles and approved inference/provider budget (enabledGrok/AGYscope as applicable). Two concise dependency questions asked; no answers/authorization received. No passwords/tokens requested in chat.

Safe alternatives tried: owned public-image OS guests, native kernel mounts/publiccreate/boot/real APFS replacement, current peer route/TCP observations, and previous scripted/native feasibility. CurrentMacguest cannot reach liveLinuxguest2049 (norSSH); actual Linux listener/selfconnection/services verified. No hostbridge/root/network policy mutation authorized. Emulation cannot become independent physical hardware or authenticated native inference. Resume from retained candidates/evidence using approved testhosts/profiles; then complete bothOS native+managedclients/Linuxnative+DockerSTORAGE/nativeactualtools+unreadassets+peerclose+restore/Standalone-Team-Org/completedartifact+healthy-previews/amd64engine/hostedworkflow-signing-bootstrap before delivery gates. A current Docker rerun cannot close these external dependencies alone.

D001/DEC015 outage hardening deferred NOTfixed; IMP-D001current links/independentSourceUpdateRemove/AGYlocal unchanged; FUP001PMcustody/historicalNuxt-Electronnongreen retained without duplicatefollowup. **Only MacDocker STORAGE deferred, not clients.** No merge/push/tag/release/deployment/TaskDone/userverification.

## Harness attempts and evidence limits

1. Warm chmod000 immediately followed by reconnect still succeeded from normal cached access; initial confirmation~10s never saw denial. Raw failures/unfinished Running retained. Later diagnostic saw actual denied source+mount, statusfalse/reconnectrefusal. Bounded120s observation confirmation saw denial at47.076s, then both actual public refusals and unchanged binding; restore original0755 and ordinaryaccess/reconnect/RW. No cacheflush/remount; chmod propagation is not the ≤5s committed-content fixture gate. controls-harness-delta.json, controls-attempts.json.
2. After publicdetach, OS-owned Apple nfsd intentionally remained listening; new independent-create attempt correctly refused2049 before creating source/pending. Guest-only test precondition reset verified noexports/noattachment/nojob/nomount then disabled/stopped solely-owned OS nfsd. Not automaticproduct cleanup/reconnect proof or userhost change. mac-detached-observation.json, new-source-harness-delta.json, both mac-fixture-reset receipts.
3. New Macsource actual0700 was wrongly compared to existing-source0755; Linuxactual0750 was wrongly compared to Mac0700. Approvedprivate/group policy permits both; no chmod correction, no repeated create. Exact mode/owner/binding and mountedRW/reconnect/detach confirmed separately. Both raw attempts and mode/harness deltas retained.
4. Linux automaticmountedRW was observed while startup internal-probe still held operationlock; immediate explicit reconnect correctly refused concurrent administrative operation. Later one separate reconnect succeeds with no repair/identity edit. linux-startup-harness-delta.json. Automatic boot proof unchanged.
5. First peer `nc -w` outertimeout lacked completedTCP output, not reachability evidence. Corrected distinct `-G3` connections capture22timeout/2049no-route; Linuxselfconnect/listener captured beforedetach. Early dependent scripts refused unmetprecondition beforeguest action; logs retained. No false `Running` receipt countedPass.
6. Case helpers persist command success before some semantic assertions; final receipt/this reconciliation is authoritative. No source patch, helper substitution, rawdevice edit or retrospective log replacement. Raw4-space/deeper Go transcript distinctions retained. Minor initial read/aggregate-output truncations do not supply evidence; source files/results reread separately.

## Cleanup, artifact integrity and next action

[cleanup.json](evidence/api-e2e/api-rev-006/cleanup.json) Complete: publicdraineddetach verified source/private modes/bytes/markers and noattachment/job/mount; exact owned Mac/Linux Tart process+clone stopped/deleted, ownedLinuxcache/toolchain/sourcecopy/scratch removed. Owned APFS images detached beforeVMdisposal. PublicMacimage/toolcache, all23retainedcandidatefiles, fiveoldDisttrees/286files preserved. No Docker,desktop,tunnel or provider resources started thisround; no globalprune/userresource stop.

Artifact audit verifies incoming1488references exceptfour canonicalAPIauthorities intentionallyupdated, completepriorrevisionbyteprefix unchanged,23candidate/286dist hashes, tracked source unchanged, JSON/Python syntax and source/report whitespace separately from verbatimlogs. Cumulative package retains historical failed attempts and criticalproof. Evidence/scripts committed explicitly, never `git add -A`.

**Outcome classification: Blocked — external environment/profile dependencies**, not failure-origin rework, not successful-test review. Fresh handoffrules recorded in E6/routing.json. Ask the user for exactdependencies; return blocker to caller only if the team communication contract requires it. No downstream pass/duplicate dispatch. Successful future reviewed-route output still goes to proportional CodeReview for cumulativeaf9f23 durabletests before Delivery.
'''
(T/'api-e2e-execution-coverage-report.md').write_text(text)
rev=T/'api-e2e-revision-record.md';old=rev.read_bytes();assert len(old)==inputs['priorRevisionBytes'] and hashlib.sha256(old).hexdigest()==inputs['priorRevisionSHA256']
entry='''

## API-REV-006 — Mac stable-volume boot and replacement correction proven; external matrix blocked

- Trigger code_reviewer CRR013 sourcePass, ApprovedSR018 / ReadySR023 / ARCH007 / IR009; inputeb7a8894fccf6316192a6f84851d43d553b99055, sourced3c88f37c30ee74a89a95a4f6906992667c9b875. Prior API005 **Fail57.14%** retained. Current **Blocked67.86%, broaderBlocked**; Large/High reviewed, no production/durablechanges or successful-testreview.
- Prior failure checked FIRST: API-F005/CR007 **resolved at actualnativeMac scope**. Fresh publiccreate, twoordinarywholehostboots actualst_dev16777228→16777229, sameAPFSUUID/inode507558/savedbindingbytes/marker/modes/content, automaticmountednonrootRW beforemanualreconnect. Separatepublicreconnectpasses. Actual differentdirectory and APFSvolume refuse copiedmarker/content; twoAPFSvolumes sameactualrawdevice16777241/inode16 butdifferentUUIDs. Exactoriginalrestored→publicreconnect/RW; noidentityediting/helperreplacement. E6/prior-failure-resolution.json/rawreceipts govern.
- Current Go7packages70topPass+1standalonechildSkip/212directsubcasePass, vetPass; Python53enum50Pass3Skip. Actual publicMacnewsource owner501:20/0700, Linux1000:109/0750; completeboundidentity/IO/reconnect/absentsourceDetach. Linuxnativefreshinstall/ordinaryboot/replacement/restore/detach regressions pass atscopedboundaries. ExactIR009CLI and unchangedIR005engine verified. API-F00480reads≤5s and API-F003boot/Stop/policy/replacement/detach resolvedscope retained, notreopened.
- Allharnesslimits retained: warmchmodprematureexpectation/shortobservation; OS-ownedAppleport remainsafterdetach thenexplicitguestfixture reset; private/groupmodeoverassertions; immediateLinuxadministrativelock; incompletepeerprobe/prematuredependentpreconditions. Corrections validateapprovedbehavior withoutproduction/source/mode/identityediting; no rawfailure erased.
- Externaldependency: independentphysicalMac/Linux+Docker/privateLAN administration and isolatedauthenticatedCodex/Claudeprofiles/inferencebudget notsupplied; currentguest22timeout/2049no-route whileLinuxselflistenerready. VM/operator/scriptedproof cannotclose physical/nativetool/linkedasset/peerclose/restore/Standalone-Team-Org/completedartifactmatrix. RemainingcurrentMacmanagedclients/UI/amd64engine/hostedworkflow/bootstrap areNotTested, notblanketimpossible. OnlyMacDockerSTORAGEdeferred; D001/DEC015/IMP-D001/FUP001 unchanged.
- Score50/75/50/75/75/75/75=67.86%; criticalproofmissing independentlyblocksPass. No user-onlywaiver, release orTaskDone. Twoexactdependencyquestionsasked; unanswered. Publicdetach/sourcepreservation and exactowned2VM/PID/clone/scratchcleanupComplete;23candidates/286oldDist/1488incomingrefsprotected exceptcanonicalAPIupdates. Fullcumulativeindex/evidence E6 and currentreportACtable; freshhandoffrules govern blockerreceipt, no failure-originorDelivery dispatch.
'''
with rev.open('a') as f:f.write(entry)
with (T/'api-e2e-coverage-investigation.md').open('a') as f:f.write('''
### Round6 final decision
API-F005 nativeMac correction directly proven first: twoordinaryboots withactualrawdevicechange automaticmountednonrootRW/savedbindingunchanged, separatepublicreconnect and realdirectory/APFSvolume copiedmarker refusal; actualreplacementvolume has same rawdevice+inode butdifferentUUID. Exactoriginalrestored. Newsource/private-group/absentpathsafeDetach and Linuxnativepublicsetup/ordinaryboot/replacementregressions completed. E6 prior-failure-resolution.json and canonicalreport govern scopedclosure; no productwidePass.
Finalscore50/75/50/75/75/75/75=67.86%, broader **Blocked** on independentphysical/privateLAN and authorizedisolatednativeprofiles/inferencebudget. ActualVMnative alternatives and peerTCPprobe attempted; no22/2049 peerroute despiteLinuxselflistenerready. Remaining feasiblemanaged/UI/amd64/hostedmatrix recordedNotTested, not allimpossible. No user-onlywaiver. No source/durablechanges, API-F004/F003 resolvedscopescarried; allrawharnessattempts preserved/correctedagainstapprovedbehavior. Publicdetach andexactownedresourcescleanupComplete; userdependencyquestionsunanswered. OnlyMacDockerSTORAGEdeferred; otherguardrails unchanged.
''')
with (T/'api-e2e-test-case-ledger.md').open('a') as f:f.write('''
## Round6 final reconciliation

- N01 Pass with retained skips:7Go packages70top/212directsubcases; Python50/53,3skips. NestedGochildtranscript notextra cases.
- V01 API-F005 scopedResolved: publiccreate→2automaticordinaryboots actualrawdevicechange→separatereconnect; realdirectory/symlink/private/permissioncontrols; actualAPFSvolume same-dev/inode differentUUID copiedmarker refusal; exactrestore; newsource/absentsourceDetach. Allcorrectedattempts named incanonicalreport; rawFail/Runningnoterased.
- V03 Passscoped nativeLinuxcurrentbinding/setup/ordinaryboot/nonrootIO/reconnect/replacementrestore/detach/newsource0750/absentsourceDetach. Immediateadministrativelockcorrectlyrefused; laterseparatecommand succeeds, noautomaticproofrepair.
- V02 Blocked independentphysical/privateLAN. CurrentTCP22timeout/2049no-route; actualLinuxselflistenerhealthy. Firstpeeroutertimeoutindeterminate, correctedprobeauthoritative.
- V05 Blocked authenticatedtestprofiles/providerbudget; currentnativeagentmatrixNotTested. V04/fullmanagedUI/amd64/hostedmatrixNotTestedthisround; notblanketdeclaredimpossible. PriorAPI005/003/004scope retained.
- Allownedresourcespubliclydetached then exactVM/PID/clones/scratchremoved; cleanupComplete. No running case remains; interrupted attempts resolved via namedconfirmations.
- FinalAPI-REV006 **Blocked67.86%, broaderBlocked**, not failure-originrework orPass. See currentreportACproof and E6/blockers.json. No release/TaskDone/userverification; await exactexternaldependencies.
''')
print('canonical artifacts finalized')
