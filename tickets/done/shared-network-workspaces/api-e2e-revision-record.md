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


## API-REV-004 — selected-node reboot correction proven; healthy committed visibility fails

- Input902638e584d8e669b632cf81bcc0a95074892403 / CRR009 / IR007 / ApprovedSR018 / ReadySR021 / ARCH005, Large/High unchanged. All774incomingrefs present; currentdefaultaggregate968f6d...b764, sameengine/currentmetadata51f81c...35ed. Personalexecution only. Reusedexact11IR005+4IR007retainedfiles; noenginerebuild. IndependentnativeCLIbuildreproduces0036ccef...c860c; cleanfullcurrentserver/desktopbuilds, no staleoverlay/publicpublication.
- PriorAPI-F003 recheckedFIRST: freshpublicselectedsetup+TWOordinarywholeLinuxhostreboots withoutmanualStart/reconnect pass sameID/image/config/ports/aliases/privatebytes/sourceidentity/UUID andactualAPI/mountedcontent. NormalhealthyStop persists through ticks/reconnect/reboot; naturallycaptured failed-start rawStopno-op/guidance and restart=no durableveto separately pass. NodeRestart/publiclauncheractualreplacement/currentrefautomaticboot/drainedDetach+exactattemptremoval pass. API-F003 resolved only at this executedscope; API-F001/F002 prior scopes retained, nohistoricalfail relabelled.
- Repository7Go packages race/count1/vet Pass; Python53enumerated/50Pass/3explicitSkip. Postrepo57.14%, broaderRequired. No currentroundproduction/durabletest edits; af9f23REST cumulativefixture/socketcoverage unchanged and successfulproportionalreview still awaitsPass.
- NativeMac freshcreate/ordinaryboot/reconnect/draineddetach/sourcepreservation Pass; nativeLinux no-node regression and selectedclient publicdetach/create/safedetach Pass. Nativeabsenceguard misquoted, no freshabsenceproof credited; corrected package/installedhash identity and API003 firstuseproof retained. MacLinuxpeerTCP2049 unreachable underordinaryNAT; no networkworkaround.
- CurrentisolatedMacdesktop+actualLinuxmanagednode/nativeNFS: PNG, PDF, audio/video playback, Markdown, HTMLrelativePNG/CSS, exactHTTP/static/GraphQL bytes pass. Late tree/file refresh and unsavedEditContext bufferpreservation pass, no completedagentartifact claim. Rawdraft-selection/selector/cacheobserver/invalidRange206 assumptions retainedandcorrected independently.
- **NewAPI-F004 / AC003 REQ004 QR001 SCN002:** healthy sourcefsync/close135bytePNG remainsold through5.010s. Two unique1024byte fresh-open trials both nativeNFS andrealDockerHTTP remainold until61.149/60.975s (122/121observations). Exactnewsourcehash, mtimeNschange, sameinode/sourceUUID; actualactimeo1/defaultY/activeengine. Nooutage/existingFD/manualcachechange. Matchingretainedsource default60s cacheexpiry is causalclue only; norepairtested. PreliminaryUnclear—likelyimplementation/enginecacheintegration; focusedreview determinesorigin/designimpact. E4/new-failure-summary.json, visibility-repro-result.json/scripts/sourceclues/identitycorrections govern.
- Final50/50/50/50/50/75/75 = **57.14% Fail**, broaderRequired. Scopedlifecyclegain does not hide newcriticalcoherencefailure or remainingrealnative/physical/bothOSclient/peer/releasegaps. No user-onlywaiver, no VM-as-physicalqualification. Stop remainingmatrix expansion for focusedfailure-origin review; rerunAPI-F004 firstafteracceptedcorrection.
- E4cleanupComplete: bothownedVMs, ownisolateddesktop/HTTPforward/tag/scratch/toolchain/privateLinuxcache removed afterpublicdetach. PublicMaccache,15retainedcandidatefiles and5oldgenerateddirs retained. Full774incomingpackage pluscurrentevidence preserved; no productionedit/delegation/merge/push/release/TaskDone/userverification. D001deferrednotfixed/IMP-D001/FUP001 unchanged. Fresh single most-specific rule governs failurehandoff, not successful-testreview/Delivery.


## API-REV-005 — healthy Linux visibility corrected; Mac persisted source identity fails ordinary reboot

- Trigger CRR011 implementation-sourcePass on IR008 / ReadySR022 / ARCH006 / unchangedApprovedSR018, Large/High. Inputd963097b6e3d0cf80e3bf4e86d900173b671fd26; sourced65aeda24fc4b9a534a3941b194dd4a55b88c00c; reviewda124edf1230a0cd4da2780766497c48f7a9723b. Personalexecution/no delegation, no production/durabletest edit. All1122incomingrefs/19retainedcandidatefiles protected; exact IR005engine reused, not rebuilt. API001–004 prefix preserved (API004 row absent from older index is historical bookkeeping, not missing entry).
- PriorAPI-F004 testedFIRST via fresh no-preinstall public nativeUbuntu selectedsetup/currentCLI and actualnative+managedHTTP; then publicdraineddetach and currentDockerstorage/image/CLI againstsamepreservedsource. Per mode20unique1KiB/1MiB fixtures12inplace4atomic4new, freshcreate+reconnect40readerchecks; total80all≤5s, worst0.935s aftersuccessfulflush/fsync/close. NoLLMtimer/cacheflush/manualconfig/remount/retryworkaround. API-F004 independently resolved only in executedLinuxscope; API004 rawFailretained.
- Current7Go packages race/count1/vet pass;56topPass1child-onlyskip/140subcases=84+42+14, nestedtranscriptnotdoublecounted. Python53enum50Pass3explicitSkip. Postrepository57.14broaderRequired. Full cleantrackedcurrentserverimage andcurrentisolateddesktopbuilds; Guideunqualified/Copydisabled/privatewarnings pass, no publicqualification.
- Linuxfirst2whole-hostboots withoutmanualStart/reconnect preservecurrentID/image/config/private/source/mountedAPI. NormalStop/ticks/explicitReconnect/boot, naturalfailedstart rawStopno-op/guidance/restartNo durableveto, nodeRestart/publicUpgrade/current-referenceboot/safeDetach pass. API-F003 remains resolved, not reopened. Actualfileoperations/concurrentdifferentfiles/HTTPGraphQL/WSPTY/scopedGit pass; samekernelnotphysicalpeer.
- FreshMacnative publiccreate/source/private/job under077 Pass (API-F001 first-use scope remainsresolved). **NewAPI-F005**: threeordinaryboots change source st_dev16777228→16777230→16777227→16777230, inode506781/UID501/GID20/mode0755/originalbytes/marker unchanged; valid disk2s5/APFSVolumeUUIDA19FE379-BE62-4297-9A39-3934CC88214B same before/afterthirdboot. Persisteddevice28 remains, service/explicitReconnect repeatedlyreject changeddevice; mountabsent/hostReadyfalse. Not an elapsed-timeSLA, source replacement, injectedoutage, or cache-policy regression claim. Compactnew-failure-summary/rawthreeboots/source-trace retained. PreliminaryUnclear—persistedidentity/platform integration; reviewer decides implementation/design origin. No fix/bypass.
- Harness correctionsonly: initialDockersetup succeeded but ownedrecreationlabel exclusion was asymmetric; freshconfirmation corrects it withoutrepeatmutation. FirstMacdiagnostic PATH/filename mistakes and diskutil(directory) invalidproof retained; corrected absolutepaths/actualdisk valid. Normalrawlogs retained. Currentremote-preview/nativeagent/physical matrix expansion stopped for newconfirmedfinding; prior scopeddesktop/scripted/locks evidence carried, not relabelled actualnativeartifact/trustedOSinput.
- Final **Fail57.14%**, broaderRequired, categories50/50/50/50/50/75/75. NewcriticalMacnormalrestartfail andremainingcriticalmatrix barPass despiteLinuxfreshnessresolution. No user-onlywaiver. Physical/macmanagedclient/nativeprofiles+inference/privateLAN dependencies explicitly asked, not supplied/inferred. OnlyMacDockerSTORAGE deferred; D001/DEC015 deferredNOTfixed, IMP-D001/FUP001 unchanged/no duplicatedfollowup.
- PublicsafeMacdetach preserves currentoriginalsource/marker despiteopenrebootfinding. Linuxnative/Dockerdraineddetach preserveprivate/source/UUID. ExactownedVMs/nodes/registry/volumes/services/tunnel/desktop/profile/tag/scratch/toolchain removed; publicMaccache/19candidates/fiveoldgeneratedtrees retained. All286olddist hashes checked. No merge/push/tag/release/TaskDone/userverification. Cumulativeaf9f23REST successfultestreview still waits onPass. E5 packageindex/manifestaudit/cleanup and canonicalACproof govern focusedfailure-origin handoff, singlefreshmatchingrule.


## API-REV-006 — Mac stable-volume boot and replacement correction proven; external matrix blocked

- Trigger code_reviewer CRR013 sourcePass, ApprovedSR018 / ReadySR023 / ARCH007 / IR009; inputeb7a8894fccf6316192a6f84851d43d553b99055, sourced3c88f37c30ee74a89a95a4f6906992667c9b875. Prior API005 **Fail57.14%** retained. Current **Blocked67.86%, broaderBlocked**; Large/High reviewed, no production/durablechanges or successful-testreview.
- Prior failure checked FIRST: API-F005/CR007 **resolved at actualnativeMac scope**. Fresh publiccreate, twoordinarywholehostboots actualst_dev16777228→16777229, sameAPFSUUID/inode507558/savedbindingbytes/marker/modes/content, automaticmountednonrootRW beforemanualreconnect. Separatepublicreconnectpasses. Actual differentdirectory and APFSvolume refuse copiedmarker/content; twoAPFSvolumes sameactualrawdevice16777241/inode16 butdifferentUUIDs. Exactoriginalrestored→publicreconnect/RW; noidentityediting/helperreplacement. E6/prior-failure-resolution.json/rawreceipts govern.
- Current Go7packages70topPass+1standalonechildSkip/212directsubcasePass, vetPass; Python53enum50Pass3Skip. Actual publicMacnewsource owner501:20/0700, Linux1000:109/0750; completeboundidentity/IO/reconnect/absentsourceDetach. Linuxnativefreshinstall/ordinaryboot/replacement/restore/detach regressions pass atscopedboundaries. ExactIR009CLI and unchangedIR005engine verified. API-F00480reads≤5s and API-F003boot/Stop/policy/replacement/detach resolvedscope retained, notreopened.
- Allharnesslimits retained: warmchmodprematureexpectation/shortobservation; OS-ownedAppleport remainsafterdetach thenexplicitguestfixture reset; private/groupmodeoverassertions; immediateLinuxadministrativelock; incompletepeerprobe/prematuredependentpreconditions. Corrections validateapprovedbehavior withoutproduction/source/mode/identityediting; no rawfailure erased.
- Externaldependency: independentphysicalMac/Linux+Docker/privateLAN administration and isolatedauthenticatedCodex/Claudeprofiles/inferencebudget notsupplied; currentguest22timeout/2049no-route whileLinuxselflistenerready. VM/operator/scriptedproof cannotclose physical/nativetool/linkedasset/peerclose/restore/Standalone-Team-Org/completedartifactmatrix. RemainingcurrentMacmanagedclients/UI/amd64engine/hostedworkflow/bootstrap areNotTested, notblanketimpossible. OnlyMacDockerSTORAGEdeferred; D001/DEC015/IMP-D001/FUP001 unchanged.
- Score50/75/50/75/75/75/75=67.86%; criticalproofmissing independentlyblocksPass. No user-onlywaiver, release orTaskDone. Twoexactdependencyquestionsasked; unanswered. Publicdetach/sourcepreservation and exactowned2VM/PID/clone/scratchcleanupComplete;23candidates/286oldDist/1488incomingrefsprotected exceptcanonicalAPIupdates. Fullcumulativeindex/evidence E6 and currentreportACtable; freshhandoffrules govern blockerreceipt, no failure-originorDelivery dispatch.


## API-REV-007 — SR025 one-VM/two-node execution; unsaved editor loss

- ApprovedSR025/DEC017, technicalIR009/d3c88 unchanged; inputdocs85c2229078. Preparation-only API007 is superseded by personal actual execution, no delegation. HistoricalAPI006 Blocked67.86 and CRR013sourcePass100 unchanged.
- ONE UbuntuVM, TWO real public-launcher current application nodes; sequential LN/LD, A-only then A+B with public drained detaches. Fresh source/UUID/config/private/permissions/API/operations/concurrency/exclusive/locks/Git/visibility and ordinary reboot/Stop/upgrade/current-reference/source-replacement/safe-detach evidence.24warmed visibility samples/mode <=5s, maxLN0.071826s LD0.069701s. Samekernel limit retained.
- Currentisolateddesktop healthy text/Markdown/PNG/HTMLrelative/PDF/audio/video/Guide and peerchange/delete/reopen; bothnode/mode real APIs/WSterminal. **NewAPI-F007-UNSAVED / AC010 REQ011 SCN006:** trusted native-input unsavedcd silently replaced by Bcommittedtext before reload/discard; priorabSave/readcontrol verifiesmodel. New durableFileExplorerTabs.unsaved.spec.ts no-peerPass/peerFail; existing2testsPass. No sourcefix. Origin reviewer decides implementation/baseline scope.
- Initial Go7packages70top/212subPass,vetPass; Python50Pass3Skip; server23/publiccontracts12/Guide21/terminal109Pass. BroaderRequired after repository67.14. Final50/95/95/95/95/50/95 = **Fail82.14%**.24Pass/2Fail ledgergroups, onefinding. No user-onlywaiver, Pass, delivery orrelease.
- Harness corrections and allremainingrawattempts disclosed: Binterruptedmigrationfixture; stoppedruntimeports; refusalword; asymmetricownedlabels; confirmationhelperlostoriginalJSON (freshv2 completeproof, no reconstructedraw); LDdisplayUID vsbackingowner; childGit scopedtrust; administrative-lockstatus. Critical livefinding not explained away by these corrections.
- L26cleanupComplete: exactVM/clone/nodes/registry/privatevolumes, own desktop/tunnel/tag/scratch/key/cache removed after preservationproof; priorpublicMaccache/IR005engine/generateddirectories retained. IV-D01–D04 deferredNOTPassed; publicrelease gatesunexecuted. Cumulativeaf9f23 successful-testreview stillawaitsgreenAPI. Fresh focusedfailure-origin route; no cumulativeindex forward. Evidence E7 and reportACproof govern.


## API-REV-008 — user-directed command-only filesystem validation Pass

- Input CRR015 sourcePass/IR010 a3f65, HEADc01dbfd, technicalNFS/launcher unchanged fromAPI007; ApprovedSR025 one-LinuxVM/two-container basis. User directly revised own API test plan to command-only filesystem work, no product UI/API/editor gate and no SolutionDesigner contact. No production or durable-test edit; IR010 retained. HistoricalAPI007 combinedFail82.14/API006Blocked67.86 unchanged.
- API008 original repository/viewer12,adjacent148overlapping,bothguards,HTTP6 Pass; local isolated Guide/reader/Markdown supplemental only. Original live editor rerun not reached, not retroactively Passed. CR-FUP002 pending-Save follow-up Task project_task_a4f90984-add2-4300-983d-de54ded3032b remains unresolved and outsidefilesystemincrement.
- Fresh ONE UbuntuVM/TWO generic command-only containers (sleep/networknone/no application), sequential public LN/LD create and safe detach; same originalsource/UUID. Both containers bind actual proven NFS mount; explicit samekernel/cache, not independentclient qualification. FS01–12 allfreshPass:26subcases,48warmed healthy visibility samples(maxLN0.060970s LD0.056318s),160independent concurrentfiles,400atomicreplacements with13031complete-onlyreaders, both-direction bytes/append/truncate/Unicodefilename/metadata/delete/permissions/exclusive/fcntl/Git/index-lock controls.
- FS13–15 Pass through exact audited API007 LN/LD command/inspection/lifecycle/source/privatepreservation evidence, with NFS/launcher/server sourcediffempty and identicalnativeCLI. Raw failedattempts excluded bycase, validcontinuations named. FS16 freshnormaldetach pluscarriedbusy/no-drain controls; FS17 exactcleanupComplete.
- Publicimage downloadtimeout/interruption safelyresumed samecache/clone; redundantDockerinstall hitunattended-upgrades lock. V2 verifiesalreadyinstalledDocker, no packageprocesskill/lockdeletion/productpatch. Rawattempts retained. AllactualfilesystemcasesPass aftersetup.
- Final **Pass95%**, categoriesall95, broaderRequired/executed; command-onlypostrepo86.43. No activecriticalfilesystemgap, no user-onlydependency. Mac/independentkernel/client/physical/externaljoin/authenticatedagent/publicrelease and generalapplication acceptance NOTPassed. Cumulativeaf9f23/helper/API007regression/IR010tests requireproportionalsuccessfultestreview; no Designer/duplicateforwarding/Delivery/TaskDone/release action.
- OwnVM/clone/guestcommandcontainers/storage/registry/privatecache/scratch/toolchain/unusedhostapptag removed; isolateddesktop previouslystoppednormally/owndatarootremoved/portsclosed. IR005engine/publicMaccache/preexistingbuildtrees preserved; no globalprune. CurrentcanonicalreportACtable+E8command-final-summary/command-carried-evidence/command-cleanup govern.

## API-REV-009 — IR011 integrated repository lifecycle validation

- Trigger CRR017 Pass / IR011 completed DR001 Local Fix. Actual input receipt
  bd57ef932dcd9e12c8470f0a1accbce0928d7ae5 after review8082eb2478; source development
  mergea4afd758a9766274b08f675c04952b19913fff0c integrates personal5096011674.
  Large/High/Reviewed retained, personal execution. DR001 owner verdict unchanged.
- Read complete current package/testing guidance; planned INT01–06 before tests.
  No new production/durable test edit. Existing REST/workspace/search coverage
  Still Valid; IR011 six bodies unchanged, public teardown lifecycle/postconditions
  retained. No compatibility/migration/data transition introduced (Not Affected).
- Fresh owned archive/frozen filtered install/current documented integration builds
  and typecheck exit0; REST6 + workspace48/9files + explorer/search12/2files =
  **66 unique tests/12files Pass**. Repeated REST6 Pass afterward (72executions,
  not72unique). Real socket and composed lifecycle, no browser/VM/application gate.
- Initial tar exclusion removed611 nested historical ticket paths; archive identity
  guard stopped before install/tests. Corrected explicit root exclusion, retained
  attempt and reused scratch; all7330 files then matched before/after. Install
  warnings resolved by normal prerequisite path; no policy/test-oracle relaxation.
- API008 **FS01–17 Pass95%** carried: exact unchanged NFS/launcher/workspace/IR010
  sources, ten critical API008 files and thirteen nested receipts audited. Whole
  integrated server is not falsely called unchanged. Same-kernel/cache command
  proof remains bounded; Mac/independent clients/physical/external join/agents/
  publication notPassed. No new original live-editor closure or CR-FUP002 retest.
- Final **Pass95%**, six applicable categories95; browser/shell N/A for no current
  boundary. Broader **Not Required** because actual changed public lifecycle and
  integrated sockets/filesystem were directly executed; no new kernel/UI gap.
  Prior API008broaderRequired/executed, API007Fail82.14/API006Blocked67.86 remain.
- Cleanup Complete: owned scratch/private HOME/cache/build/testDB removed, no own
  processes/cwds;286old dist files and8retained engine files unchanged. No VM,
  Docker, browser, user app/data/credential/network actions; no global prune.
- Evidence E9/checks-result/logs/scope-audit/final-summary/cleanup and current report
  AC tables. Own4docs updated; no new blocker/finding. CR-FUP002 existing PM Task
  project_task_a4f90984-add2-4300-983d-de54ded3032b unresolved/nonblocking; retainIR010,
  D001/IMP-D001/FUP001 dispositions. No Designer or duplicate scope/Task dispatch.
- Next fresh successful Large/High rule: proportional review of IR011 small REST
  test delta, carrying CRR016 cumulative test review, before Delivery resumes.
  No target merge/push/tag/release/deployment/TaskDone/userverification claimed.

- Final artifact whitespace check: raw log terminal newlines/git-diff context only;
  preserved bytes/hashes, source/docs/runners clean. Initial commit chain stopped
  before commit; not a failed test or ignored product assertion. E9/artifact-whitespace.json.
