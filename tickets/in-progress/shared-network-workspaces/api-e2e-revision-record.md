# API/E2E Revision Record — Shared Network Workspaces

Canonical current truth: [coverage investigation](api-e2e-coverage-investigation.md), [execution report](api-e2e-execution-coverage-report.md), [test-case ledger](api-e2e-test-case-ledger.md). Keep entries across later rounds; no missing result implies Pass.

## Revision index

| Revision | Trigger | Related upstream | Prior result/confidence | Current result/confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | code_reviewer / CRR002 Pass / first API execution | Approved SR018, Ready SR019, ARCH-REV003, IR003, CRR002; IR001/002 and CRR001 history retained | N/A | **Fail / 57.14%** |
| API-REV-002 | code_reviewer / CRR004 Pass / IR004 re-entry | Approved SR018, Ready SR019, ARCH-REV003; all prior rounds retained | Fail /57.14% | **Fail /57.14%** |
| API-REV-003 | code_reviewer / CRR007 Pass / IR006 re-entry | Approved SR018, Ready SR020, ARCH-REV004; all prior rounds retained | Fail /57.14% | **Fail /57.14%** |

## API-REV-001 — nativeMac first-use failure exposed through actual VM execution

- Trigger: complete source Pass package, Large/High, plus user suggestion to use Mac VM; no delegated workers. Personal validation round1 on branch `codex/shared-network-workspaces`.
- Baseline input HEAD `3b7dd9a2895f4b8fedc5e1bcdd00c913d97fae2f`. Durable test-only commit `af9f23df93a63ca6c8305f51439a855acc2133c7`; previous audited source bytes unchanged.
- Investigation/ledger written before execution. Cases N01–04 and V01–05 planned; added V02-repro when V02 first-create failed. No obsolete assertion removed.
- Coverage correction: `autobyteus-server-ts/tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts` Needs Update after original route-only fixture failed five cleanup calls requiring process authorities. Reuse full test server composition, unregister before close; retain original response assertions and add actual HTTP HTML/relative-media replace/delete regression. Separate baseline-fix commit per TESTING9. Six-case rerun Pass; original failed output preserved. Not NFS/browser proof.
- Repository: Python39pass/3skip of42; seven Go test packages/race/vet/native build pass; server133pass; original public contracts35pass/5fixture-fail then corrected workspace6pass; scripted AGY8pass; Guide21pass; terminal109pass. Exact commands/gates in evidence. Existing full Nuxt/Electron three updater failures retained as FUP001, already in PM custody; no patch/suppression/re-notification.
- Post-repository score53.57%, broader Required. Built unqualified current native binary using private checksum-verified official Go. No public release metadata edit.
- V01: fresh disposable Mac26.6.2/APFS/Apple NFS3, actual sudo/root install under077, nonroot501:20 source/mount and same original content; hostReady, managed launchd. Narrow Pass, not released installer/guided password/physical peer/reboot proof.
- V02: fresh source-host create fails before peer/Docker/operation steps, mount_nfs exit74/rpc.statd RPC prog. not avail. V02-repro fresh single VM repeats same first-use failure with self+host allowlist; original V01 success retained. Postfailure diagnostics show later RPC registration. Public reconnect succeeds with same UUID/hostReady. Root cause not established, no production fix attempted. Normal first setup, not deferred outage injection.
- Original two-VM harness isolated each guest on its own subnet; future peer matrix needs shared owned network. SingleVM self-mount reproduces independently. Diagnostic nfsstat path typo recorded, not called product failure.

### Prior failure resolution

None from a prior API/E2E round (prior result/confidence N/A). CR001 permission correction is upstream CRR002/IR003; this round adds actual nativeMac root/different-UID evidence. Initial N03 fixture failure was found and corrected within this round; failed log is retained, not rewritten as Pass.

- Canonical artifacts updated: investigation postrepository/final decisions; report complete acceptance-criteria proof/commands/failure/score/cleanup; ledger reconciled all cases.
- New open failure: **API-F001** / V02 and V02-repro / AC012,018,019 (retry AC014 partially proven). Preliminary **Unclear**; recommended review focus native setup/service-start/mount implementation, but reviewer confirms origin and owner before rework.
- Final result **Fail /57.14%**; all categories below90%, target95% not met, missing/failing critical proof independently blocks Pass. Broader validation Required and executed, now reroute rather than repeat unrelated matrix work.
- Remaining scope: V02 later operations/native and Mac managedDocker clients/identity/preservation/normal restart; V03 Ubuntu/ext4/Ganesha/native+DockerLinux storage/Linux clients and independent physical peers; V04 current isolated desktop mounted previews/Guide; V05 actual native tools, support assets, peer close/restore, standalone/Team/Org/source policies. No user-only waiver. Default unqualified release retained; no published installer claim. DEC015 outage isolation remains deferred, not a new gate.
- Cleanup: all four exact owned clones/processes absent; own scratch/toolchain/data/binary removed; public VM cache and preexisting generated dist retained. No user app, node, data or credentials touched. Evidence under `evidence/api-e2e/api-rev-001/` retained for failure-origin review.
- Main Task stays open. Delivery/merge/push/release/user-verification not performed. Fresh rules select the next exact recipient; current Fail requests focused failure-origin review, not successful-test review.

## API-REV-002 — prior Mac failure resolved; new nativeLinux readiness failure

- Trigger: CRR004 source Pass on IR004; input82dd5d9d53e2e4f5e022ff3f6f0e196ebd3602d8, source174e480bd0cfaee29f22fd46b1922afbb274e56b; ApprovedSR018/ReadySR019/ARCH003 unchanged. No delivery re-entry.
- Read cumulative package, initialized Round2 plan/ledger before execution. Personal execution only. No source/durable test edits, no delegated worker, release or finalization. E1 API-owned af9f23 REST test unchanged.

### Prior failure resolution — before new failure evaluation

| Prior reference | Previous classification | Resolution | Evidence |
| --- | --- | --- | --- |
| API-F001 / V02 / V02-repro / CR002 | API001 Unclear; CRR003 Implementation Local Fix | **Resolved at tested nativeMac first-create scope**, rechecked first after build prerequisite: two fresh current-source creates11.571s/22.772s, no manual reconnect, same original identity/bytes/UUID and correct modes/live job | E2/prior-failure-resolution.json, V02-repro-result.json, V01-result.json |

Prior API001 Fail57.14%, implementation's failed candidates and source history remain retained. Resolution is not complete matrix/physical/published-installer qualification.

### Execution and new failure delta

- Current N01: all7Go race/vet packages pass, Python42enumerated/39pass/3explicit skips; official privateGo1.27.2 download succeeds. Reviewer prior download interruption is not a product/test failure. Carry unchanged E1 TS/UI/socket/scripted evidence, not an invented rerun.
- Post-repository confidence57.14%, broaderRequired. V02 server create passes; actual native peer connect times out while routeREJECT/pingHost is down. RawFail retained, healthy peer proof **Blocked by environment**, not API-F001 recurrence or a new product outage finding. LAN guest permission asked; not used.
- V03 uses separate fresh public Ubuntu24.04.5/ext4/kernel7.0.0-38 guests and real1000:109/root install. Normal build-only release.py metadata in disposable source copy supplies unchanged reference pins, qualifiedTargets[], no publication/tracked metadata change. Productionhash497efd6abb0c2cfa4c740a87f005c529cbf026a6fa218b3acd345826f4a923da; Linuxbinary9aae4944c680e3be1331f760f2c07794695a2dbea6327858ca87007b77111fd3.
- **API-F002**: two fresh public nativeGanesha creates fail17.258s/16.252s after pinned apt succeeds, activeGanesha4.3 and actualNFS4.1 mount. Nonroot marker openat remoteI/Oerror; no false ready/attachment job. Public reconnect also fails. Ordinary mounted reads succeed. Corrected installed-binary strace under exact1000:109/clearedgroups passes on source but fails on mounted directory openat EREMOTEIO. Root cause not established; no production workaround.
- Initial diagnostic guessed wrong installed path; preserved raw evidence shows trace never ran there. Separate corrected trace uses /usr/libexec/autobyteus-nfs/autobyteus-nfs. No overwriting failure output.
- Canonical investigation/report/ledger updated; all20AC proof table and seven-category scorecard current. Final **Fail/57.14%** (50/50/50/50/50/75/75;400/7), same score because critical gaps remain despite stronger twoOS evidence. No user-only waiver. New openAPI-F002; API-F001 resolved. Preliminary **Unclear**; request focused failure-origin review, recommended focus nativeLinux implementation integration, reviewer confirms owner.
- Stop remaining V02/V03/V04/V05 after new reproduced finding. Remaining native/managedDocker clients on bothOS, LinuxDocker storage, independentphysicalMac/Linux/Docker, exactselectednode preservation/restart/detach, realnative tools/assets/peerclose/restore/Standalone-Team-Org/sourcepolicies, mounted desktoppreviews/Git remain required. OnlyMacDockerSTORAGE deferred. D001/DEC015 remains deferred notfixed/notnewgate. FUP001 retained with current-source non-green/candidate-only distinction, no repeated notice.
- Cleanup E2/cleanup.json: all6ownedclones/processes absent, ownscratch/toolchain/candidate/Linuxcache removed; priorpublicMaccache and5untrackeddist dirs retained. No userhost/network/node/credential mutation. MainTask open, no merge/push/release/delivery/userverificationPass.
- Complete cumulative package at E2/package-index.json; E2=evidence/api-e2e/api-rev-002. Latest canonicalreport governs; fresh rules select Fail/focusedfailureorigin handoff, not successful-testreview.


## API-REV-003 — prior Linux first-use defect resolved, normal managedDocker reboot failure

- Actual input HEADe8ed5627da2afa646c9ab89c6ce69b3a0bc0826c / CRR007 / IR006; review68fcb74588d502570dc511b46bc6e7918bc538c8 plus receipt/history-only commit. Large/High retained; personal testing/no delegated worker. Current default source4568593b99bb3dff263e9824ceb7176e04a95ec90e3cd14a9f7421b4e43055ac; current actual arm64manifest/source5563645d23aaac13aaa26948490d68dfc12fef31775bb66156185f9052ab0acc. All11 IR005 retained candidate files unchanged; reused exact patched engine pair/source/notices, regenerated current CLI metadata, no engine rebuild/public qualification.
- **Prior failure resolution FIRST:** API-F002 public nativeUbuntu24/ext4/kernel7.0.0-38/defaultdirectorydelegationsY create passes without manual engine installation or marker bypass. Three fresh creates16.044/16.215/16.778s; first2 later harness errors retained; final full case passes, including real root/private modes/nonroot1000:109/no groups, source/mount UUID/bytes/inode/device/owner/mode, livejob and reconnect0.508/0.605s. API-F001 earlier Mac scoped resolution retained, not freshMacrerun.
- N01 current7packageGo race/vet Pass; Python52enumerated/49pass/3skip. Postrepository57.14%, broaderRequired. Full broad historical Nuxt/Electron non-green/FUP001 retained, no suppression/patch/duplicate owner notification.
- Linux native/Dockerstorage original-source file operations/reboot automatic remount/draineddetach pass; real current-image Linux managedDocker client publiccreate/reconnect and exactprivate/config/image/ports/alias/unselectedpreservation pass. Fullserverimage built clean from trackedHEAD/unchanged documentedDockerfile because oldimage-overlay baseline was unsuitable. LoopbackVMregistry only, no publicpublication.
- Mounted actualHTTPGraphQLCRUD/RESTmediaHTMLrelativeasset/freshreplacement/delete404 andWebSocketPTY scopedGit/cwd pass; actualnative/Docker distinctmountPOSIXrecordlock denial/release/acquisition pass, samekernelnotphysicalpeer. CurrentisolatedMacdesktop remoteGuideunavailable/disabledcopy/warnings and mountedHTMLrelativeimage/image/textvisibilityrefresh pass. No providerturns/realcredentials/nativeassets/completedagentartifact/physicalqualification inferred.
- **New API-F003:** selected-node ordinaryDockerrestart passes, but normalwholeUbuntu reboot leaves previouslyrunningunless-stoppedclient exited255, NFSnamedvolumemountconnectionrefused. Laterstorageengine/nativehostready, originalbytes/UUID preserved, selectedAPI unavailable. Publicreconnect retainsstoppedstatus. Read-onlydiagnostic capturedfirst; diagnosticmanualstart restores identicalnode/config; secondordinaryreboot reproduces samefailure. AC007/014/018/019, SCN009/013; no outageinjection. PreliminaryUnclear—likelyimplementation/dependency lifecycleintegration; focusedfailure-originreview determinesowner/designimpact.
- No production/durabletest changes. Cumulative af9f23 REST test unchanged; no removed assertions. Harness/fixture errors corrected separately and raw failures retained. Additional native/peer/physical/client/runtime/desktopartifact matrix remainsNotTested; no user-only waiver.
- Canonical investigation/report/ledger updated in place; E3/new-failure-summary.json and complete package-index/manifest/audit/cleanup provide evidence. AllpriorAPI/IR/CRR/design/feasibility histories retained. SourceUpdateRemove independence/privatecurrentlinks/AGYlocal unchanged; D001/DEC015 deferredNOTfixed/notnewgate.
- Final50/50/50/50/50/75/75 = **57.14% Fail**, broaderRequired. Criticalrestartfailure/missingmatrix independentlyblocksPass; confidence notpassrate. Cleanup onlyownedresources, retainedIR005candidate/publicMaccache/fivegenerateddirs untouched. No merge/push/tag/release/TaskDone/userverification. Route completeFailpackage to fresh most-specific failure-originrecipient; no successfultestreview/Deliveryhandoff.
