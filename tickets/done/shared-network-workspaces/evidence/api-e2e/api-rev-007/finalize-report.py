from pathlib import Path
import json,subprocess as sp,hashlib
E=Path(__file__).resolve().parent;T=E.parents[2];R=Path.cwd()
def j(n):return json.loads((E/n).read_text())
for n in ['LN-source-detach-resume-result.json','LD-source-detach-result.json','LD-lifecycle-upgrade-result.json','LN-files-result.json','LD-files-v2-result.json','LN-mounted-api-result.json','LD-mounted-api-result.json','LD-preview-api-result.json']:
 assert j(n)['result']=='Pass',n
assert j('cleanup.json')['result']=='Complete'
vis={m:next(x['evidence'] for x in j(n)['cases'] if x['id']=='L11') for m,n in [('LN','LN-files-result.json'),('LD','LD-files-v2-result.json')]}
score=[50,95,95,95,95,50,95];mean=round(sum(score)/len(score),2)
report=f'''# API/E2E execution coverage report — API-REV-007

## Authoritative current result

**Fail — {mean}% validation confidence. Broader validation: Required and executed.**
One confirmed critical finding: **API-F007-UNSAVED / L23 / AC-010 / REQ-011 / SCN-006**.
A peer file modification silently overwrites a real unsaved editor buffer. This prevents Pass regardless of storage successes.

- Basis: **Approved SR025 / DEC017**, current solution handoff, technical SR023 / IR009 / source `d3c88f37c30ee74a89a95a4f6906992667c9b875`; accepted docs HEAD at execution `85c2229078f81f239ad82e057d5360237edde129`. Large / High reviewed route; CRR013 source Pass100 remains separate authority.
- Personal execution, no delegation. All active L01–L26 groups now have executed or explicitly scoped carried evidence: **24 Pass groups, 2 Fail groups (L02 new regression and L23 live behavior), one underlying finding**. Raw failed harness attempts remain documented; valid repeats, not edited raw receipts, determine final scoped results.
- API006 remains historical **Blocked67.86%**; its Mac peer TCP22/2049 gap was not fixed. SR025 changes the acceptance topology, not historical facts. API007 preparation is now superseded by this actual execution result.
- No production changes, source repair, architecture rereview, merge, push, release, TaskDone or claim of user verification. Final cleanup Complete.

## Environment / build identity

ONE disposable Ubuntu24.04.5/ext4 arm64 VM `ab-nfs-api007-linux-b72ac1ef`, 4CPU/8GB; TWO actual current-public-launcher application nodes `autobyteus-server-0` and `autobyteus-server-1`. Native Linux Ganesha (**LN**) then Docker-Linux Ganesha (**LD**) sequentially; actual public drained detach between configurations. A-only with B unselected first; then fresh public A+B setup against the preserved nonempty original source and UUID.

- Source `/home/admin/ab-nfs-api007-linux-b72ac1ef-native-source`; native/container root `/Volumes/autobyteus-shared`; storage UUID `c0ab74ea-5701-41ed-b7b4-1c2c7dce5069`. Real inode/device, mount/options, Config/HostConfig, boot IDs and container IDs are in setup/lifecycle receipts; changing IDs after public upgrade is expected and verified.
- App image `sha256:a790be37c80041d93f510dff82552b4272965aaa570bd7937f225d0bfa3d91d2` built from current tracked worktree. Real servers, REST/GraphQL/WS PTY, original source and distinct actor processes; no mocked file storage.
- Native CLI SHA256 `{j('build-result.json')['binary']['sha256']}`; LD CLI SHA256 `{j('build-docker-result.json')['binary']['sha256']}`. Same technical source; LD private build changes only test-loopback engine-image metadata.
- Engine digest `{j('build-docker-result.json')['engineImage']}`. Exact IR005 patched Ganesha4.3-8ubuntu1+autobyteus1 arm64 pair/source provenance reused and verified, not rebuilt or newly release-qualified. Current source aggregate `f0d71675d3d9b70d89969a8071b8de03287cff0676669ddab295f14568041c88`. `qualifiedTargets=[]`; no public release invented.
- Actor filesystem operations run UID1000:GID109. Source mapall writes actually1000:109. LD client stat displays UID1001:GID109 while original backing UID remains1000:109; recorded, not normalized in runtime. Required source mapping and both-node access/permission behavior passed. Standalone Git uses only the verified selected project in the child safe.directory environment; real product terminal separately proves scoped Git access.
- Synthetic noncredential sentinel files in each node's own auth/data/browser volumes. No real account, provider credential, agent turn or inference budget used.
- Isolated worktree-built Electron `iso-63125-cdfd`, ports63125/63126, remote node A through owned SSH loopback63567, own HOME/profile; only CUA UI actions. Normal isolated-app stop removed it and released ports.

**Limit:** both nodes share one Linux kernel/daemon and may share a Docker NFS volume/cache. This proves real two-process/application-node use, not independent-kernel cache/lock behavior, independent-network authorization, external-computer join or Mac parity. LN native/source controls supplement A↔B; they do not remove this limit.

## Execution and durable coverage

Authoritative discovery: root `TESTING.md`, `DESIGN.md`, root/package AGENTS; frontend README/ARCHITECTURE and isolated-app instructions, NFS README/packaging, server/package manifests/configuration. Existing investigation lists exact inputs and coverage-validity decisions. IR009 compatibility removal is clean; Linux current device+inode/marker/private data directly usable with no migration. Fresh real source replacement, restored original, repeated detach/create and ordinary boots verify that disposition. No compatibility shim or state migration added.

Fresh repository layer (`narrow-checks-result.json`, `app-checks-result.json`, logs, `test-counts.json`):
- Go race/count1:7packages,70top-level and212direct subcases Pass; vet Pass. One standalone child skip is executed by the parent harness, not extra Pass.
- Python53enumerated:50Pass,3Skip (Go-owned child fixture, unavailable pwsh, occupied host8001 collision fixture). The real guest launcher creates two nodes with distinct ports; the host collision fixture remains skipped.
- Focused server4files23tests; real HTTP/local workspace+run-file-change contracts2files12tests; Guide3files21tests; terminal17files109tests, all Pass; integration preparation Pass. Not a full-repository suite claim.
- **New durable test** `autobyteus-web/components/fileExplorer/__tests__/FileExplorerTabs.unsaved.spec.ts`: no-peer editor update/Save control Pass; actual store peer-modify path **Fail**. Run with existing `FileExplorerTabs.spec.ts`:3Pass/1Fail. Command and exact output in `unsaved-regression-result.json` / `unsaved-regression.log`.
- Cumulative `af9f23` workspace REST/runtime-helper test work remains separate and still needs proportional successful-test review after validation is green. Current request is **failure-origin review**, not successful-test review or Delivery.
- Temporary executable harnesses are under this round's evidence folder. They drive public CLI/launcher, actual filesystem/client/process APIs and record each case before the next; they are not new product architecture.

Repository-only score was50/75/50/75/50/75/95 =67.14%, broader **Required**. Real NFS, ordinary boot/Stop/recreation, bytes/permissions and rendered previews were material missing boundaries, so repository passes did not end validation.

## Acceptance-Criteria Proof (SR025 increment, not full advertised platform)

All links below are relative to this ticket; evidence root is `evidence/api-e2e/api-rev-007/` (E7). Canonical case ledger contains exact attempt sequence. Commands/cwd/build/identity and actual outputs are embedded in raw JSON receipts or the neighboring executable harness, not inferred from summaries.

| Criteria / increment | Cases / result | Direct evidence |
| --- | --- | --- |
| AC001/017/018; IV-F01/02 topology, original source and public A-only/A+B setup | L01/03/05–07 **Pass LN+LD scoped**; independent-computer parts deferred | E7/build-result.json, build-docker-result.json, selected-create-result.json, native-detach-result.json, LN-both-create-result.json, docker-selected-create-v2-result.json, docker-single-detach-result.json, LD-both-create-result.json |
| AC003 healthy exact <=5s; IV-F02 | L11 **Pass LN+LD**:24warmed samples/mode,1KiB+1MiB,in-place/atomic/new,A→B/B→A/source→A/source→B; maximum LN{vis['LN']['maxSeconds']:.6f}s, LD{vis['LD']['maxSeconds']:.6f}s after actual fsync/close, fresh-open hashes, no cacheflush/remount | [LN filesystem](evidence/api-e2e/api-rev-007/LN-files-result.json), [LD filesystem v2](evidence/api-e2e/api-rev-007/LD-files-v2-result.json) |
| AC004/005 filesystem/concurrency/locks/Git; IV-F02 | L08–15 **Pass LN+LD**: both-direction CRUD/append/empty/Unicode/binary, nested dirs/list/rename/replace/delete/errors, relative symlink/chmod/execute,80concurrent independent files/mode, coordinated three Git commits, exclusive-create one winner, actual advisory lock contention/release | Same filesystem receipts, guest-filesystem-cases.py and v2; same-kernel lock limit explicitly retained |
| AC006/008/009 unsafe setup, permissions/private data; IV-F03 | L04/16 **Pass**: private/symlink source and nonemptytarget/consent/malformedinput refusal; no node mutation, source mapall/root writes and EACCES; private paths not exported; source/private identity and hashes preserved | E7/preflight-controls-result.json; LN/LD filesystem receipts; selected-create/both-create/detach receipts |
| AC007/014/017/019 healthy repeat/boot/lifecycle; IV-F04 | L17–20 **Pass LN+LD**: automatic readiness before manual repair, stopped intent through ticks/reconnect/boot, public restart/upgrade and current replacement references, same source/private bytes; narrow old restart=no failed-start veto carried only at its verified unchanged source scope | [LN lifecycle first](evidence/api-e2e/api-rev-007/LN-lifecycle-result.json), [LN lifecycle continuation](evidence/api-e2e/api-rev-007/LN-lifecycle-resume-result.json), [LD lifecycle v2 partial](evidence/api-e2e/api-rev-007/LD-lifecycle-v2-result.json), [LD actual replacement continuation](evidence/api-e2e/api-rev-007/LD-lifecycle-upgrade-result.json), policy-veto-carried-scope.json links exactAPI005 receipt |
| AC006/009/014/017 source replacement/safe detach; IV-F03/04 | L21/25 **Pass LN+LD**: different actual inode with copied marker refused without rebinding; restored original reconnects; no-drain/busy refusal, ordinary after-drain detach, source/marker/private volumes/config retained; no forced/lazy unmount | E7/LN-source-detach-result.json (L21), LN-source-detach-resume-result.json (L25), LD-source-detach-result.json |
| AC006/010 filesystem-facing APIs; IV-F05 | L22 **Pass LN+LD** both real node APIs, exact bytes/MIME/errors/authorization, B→A and reverse peer changes/deletion; actual scoped WebSocket terminal/Git | [LN APIs](evidence/api-e2e/api-rev-007/LN-mounted-api-result.json), [LD APIs](evidence/api-e2e/api-rev-007/LD-mounted-api-result.json) |
| AC010 healthy media and deliberate refresh; IV-F05 | L23 **Fail** unsaved edits. Other subchecks Pass: both-mode exact media API bytes, current LN desktop rendered text/Markdown/PNG/PDF/audio/video/HTML-relative assets; peer update/delete and deliberate reopen show current content. LD renderer evidence carried only as mode-invariant same unchanged renderer/REST path; no fresh LD desktop claim | [live failure](evidence/api-e2e/api-rev-007/ui-unsaved-peer-reproduction.json), [save control](evidence/api-e2e/api-rev-007/ui-unsaved-save-control.json), [desktop observations](evidence/api-e2e/api-rev-007/LN-desktop-observations.json), LN-preview-api-result.json, LD-preview-api-result.json, ui-peer-preview-update.json |
| AC020 Guide; applicable local regression of AC010; IV-F05 | L02 initial suites/L24 **Pass**; L02 new dirty-buffer regression **Fail**. Guide unavailable and copy-disabled truthful; clipboard denial/copy contract21unit tests. Local-preview current real HTTP regression passed; no new separate local-workspace desktop journey claimed | E7/desktop-guide-observation.json, guide-unit.log, public-contracts.log, unsaved-regression.log |
| AC012/015 public workflow portions | Current public binary create/status/reconnect/detach/launcher proven above. Descriptor/parser tests remain scoped; external-computer join deferred. Published bootstrap/signing/platform release gates NotTested, not supplied by local create | E7 public setup receipts and packaging logs; requirements IV-D04 / IV-R01 |
| AC002 agent portions, AC010 completed-native-artifact portions, Mac/physical portions AC001/013/016/018, personal verification | **Deferred, NOT Passed**, per IV-D01–D04; not dependencies for active file tests | approval-record-sr025.md; requirements DEC017; API006 remains historical |
| AC011 / IV-F06 delivery | L26 API resource cleanup **Pass**. Integrated delivery/docs/finalization and later release not performed; blocked by current finding/review | [cleanup](evidence/api-e2e/api-rev-007/cleanup.json); normal downstream route after correction and green validation |

## Finding: API-F007-UNSAVED

Expected: a local unsaved editor buffer survives another participant's committed change; any deliberate reload does not silently discard it (AC010).

Observed in current isolated desktop / remote actual node A:
1. Notes initially rendered original mounted text. Native keys entered `ab`; without a peer update, Terminal→Files retained it.
2. Node B fsynced/closed new text; editor showed peer bytes instead of unsaved `ab` after tab refresh.
3. Focused control: native `ab` then Cmd+S displayed “Changes saved”; independent node B read exactly`ab`, proving real editor/model input rather than a DOM-only text change.
4. Native keys changed to`cd`, **without Save**. B still read`ab`, then wrote/fsynced/closed`API007_PEER_REPRO_FINAL`. The editor silently changed to that peer text **before any reload/close/discard**. No confirmation appeared. Original source contained exact peer bytes; NFS storage itself did not lose bytes.
5. Added durable real-store peer-modify regression fails with actual Save argument`peer committed bytes`, expected`local unsaved draft`; no-peer control and two existing lifecycle tests pass.

Preliminary **implementation behavior**, independently reviewed origin pending. Trace in `unsaved-source-trace.md`: streamedmodify → invalidate/refetch → deep activeFileData watch overwrites local fileContent. No source fix in this round. Historical API004 synthetic EditContext preservation evidence does not close this stronger native-input reproduction. CUA screenshots are in execution tool outputs; semantic sequence/AX facts and API/hash controls are persisted. No screenshot-file path is invented.

## Harness corrections and evidence limits

Preserve and disclose, do not treat as product defects or silent passes:
- First resume host DockerPATH and empty-findmnt false oracle; corrected clean inventory before mutation.
- B interrupted initial DB migration caused P3009 fixture health failure. Destroyed/recreated only disposable B through public launcher and exact owned volumes, then awaited health; no schema editing. Original attempts remain.
- LN stopped-node runtime Ports empty is expected; desired HostConfig port bindings remain exact. Resume after corrected state-aware oracle, not manual-start repair.
- No-drain refusal says`detach declined; nothing changed`, not literal`drain`; corrected expected wording, retained firstresult.
- LD first selected-create owned recreation-label comparison asymmetric. Confirmation helper then overwrote its own raw JSON before loading snapshots: **evidence loss disclosed**, not reconstructed. Original console/tool observations retained; first preservation proof not credited. Safe public detach and **fresh v2 create with new complete snapshots** provides proof.
- LD client numeric owner overassertion corrected to actual backing owner contract; both displayed IDs retained and allfunctional cases rerun in unique-v2namespace. No chmod/idmap/source repair. ChildGit trust stays scoped to verified project.
- LD API precondition initially referenced superseded file receipt; no guest effect; corrected to validv2 receipt. LD firststatus hit supervisor administrative lock and correctly reported incomplete. V2 waits only that exact response; no retry of arbitrary errors or bypass of automatic-boot proof.
- LD already-current upgrade correctly no-opped; the harness incorrectly demanded different IDs. Valid L17–19 and restart proof retained. A test-owned new image with only a provenance label changed then exercises actual public upgrade/replacement/boot; exact same application bits, not product-version compatibility proof. New image ID and Dockerfile are in `LD-lifecycle-upgrade-result.json`.
- Earlier streamed-v2case text named the old receipt: final source is`LD-files-v2-result.json`; raw text remains. No source identity/cache/settings changes used to make cases pass.

## Final confidence / residual risk

| Mandatory category | Score | Evidence and residual |
| --- | ---: | --- |
| Requirement / AC proof | 50% | Critical AC010 unsaved preservation fails despite complete scoped storage matrix |
| Changed-boundary directness | 95% | Public setup/actual mounted bytes/real nodes/ordinary lifecycle/UI; no material mocked storage gap within approved topology |
| Cross-boundary integration realism | 95% | Two real server processes, NFS, source, APIs/PTY, isolated desktop; accepted same-kernel scope, not independent-client qualification |
| Environment/config/identity/fixture fidelity | 95% | Exact builds/images/engine/private fixtures and fresh complete repeat evidence; failed fixture/evidence attempts disclosed, not counted |
| Failure/edge/lifecycle/recovery | 95% | Safe refusals, source replacement, ordinary boots/Stop/upgrade/detach; no unsupported outage-recovery promise |
| User surface / desktop shell | 50% | Healthy previews/Guide work but real unsaved text loss blocks confidence |
| Durable regression quality/relevance | 95% | Existing focused suites plus new red real-store regression/control matches live failure; complete failing output retained |

Arithmetic mean **{mean}%**. Missing/failing critical proof independently bars Pass. No unresolved external dependency blocks this validation stage; result is **Fail**, not Blocked. Physical/Mac/agent/personal deferred qualifications remain notPassed and are not scored as active proof gaps. Independent review must determine failure origin/owner and correction, then rerun L23/new regression and affected acceptance surfaces. Do not hand off to Delivery or request successful-test review now.

## Cleanup and continuation

`cleanup.json`: public safe detach proved original source/marker/private bytes/config before retirement; exact owned LinuxVM/clone/guest nodes/registry/volumes, own private cache/scratch/toolchain/key, host testimage tag, isolated desktop/tunnel removed. Ports63125/63126/63567closed. Previous public Mac cache, retained IR005candidate/engine and existing generated SDKbuilddirectories preserved. No hostbridge/firewall/live-node/realcredential mutation.

Current own canonical artifacts: investigation, this report, ledger, revision record. Earlier round raw evidence stays linked there; no legacy cumulative index forwarded. Focused failure-origin handoff attaches current requirements/design, new test, failure/control/log/trace and this round's material storage/cleanup proof. Fresh route governs recipient. Evidence folder: `{E}`.
'''
(T/'api-e2e-execution-coverage-report.md').write_text(report)
# Reconcile active table; historical rows remain untouched.
p=T/'api-e2e-test-case-ledger.md';lines=p.read_text().splitlines()
for i,l in enumerate(lines):
 if l.startswith('| L') and l.split('|')[1].strip()[1:].isdigit():
  cid=l.split('|')[1].strip();status='Pass LN+LD / valid scoped evidence; see API007 report AC proof and immediate case events'
  if cid=='L02':status='Fail new AC010 regression (3Pass/1Fail); initial repository suites Pass with listed skips'
  if cid=='L23':status='Fail unsaved-buffer loss; LN UI plus both-mode API/media healthy subchecks Pass; LD renderer mode-invariant carry explicitly scoped'
  if cid=='L24':status='Pass current Guide UI/21unit and real HTTP local-preview regressions; no separate new local-workspace desktop journey'
  if cid=='L26':status='Pass exact owned cleanup Complete; evidence retained; no production/source repair or finalization'
  a=l.split('|');a[-2]=' '+status+' ';lines[i]='|'.join(a)
p.write_text('\n'.join(lines)+'\n\n## API007 completed result reconciliation\n24Pass/2Fail case groups; one underlying finding API-F007-UNSAVED (L02 red regression, L23 live). Full planned scoped categories attempted; not all acceptance passed. Final report Fail '+str(mean)+'%, cleanupComplete. No deferred qualification counted as Pass.\n')
with (T/'api-e2e-coverage-investigation.md').open('a') as f:f.write('\n### API007 completed reassessment\nBroader execution completed for SR025 one LinuxVM/two real launcher nodes and both sequential storage modes. Final category scores50/95/95/95/95/50/95 = '+str(mean)+'% **Fail**; AC010 actual unsaved-buffer overwrite and matching new durable regression preventPass. Independent failure-origin review required; no productionfix. All storage/lifecycle/API categories have direct scoped evidence; samekernel/Mac/physical/agent/release limits unchanged. CleanupComplete. See current report ACproof for authoritative mapping and raw attempts.\n')
with (T/'api-e2e-revision-record.md').open('a') as f:f.write(f'''\n\n## API-REV-007 — SR025 one-VM/two-node execution; unsaved editor loss\n\n- ApprovedSR025/DEC017, technicalIR009/d3c88 unchanged; inputdocs85c2229078. Preparation-only API007 is superseded by personal actual execution, no delegation. HistoricalAPI006 Blocked67.86 and CRR013sourcePass100 unchanged.\n- ONE UbuntuVM, TWO real public-launcher current application nodes; sequential LN/LD, A-only then A+B with public drained detaches. Fresh source/UUID/config/private/permissions/API/operations/concurrency/exclusive/locks/Git/visibility and ordinary reboot/Stop/upgrade/current-reference/source-replacement/safe-detach evidence.24warmed visibility samples/mode <=5s, maxLN{vis['LN']['maxSeconds']:.6f}s LD{vis['LD']['maxSeconds']:.6f}s. Samekernel limit retained.\n- Currentisolateddesktop healthy text/Markdown/PNG/HTMLrelative/PDF/audio/video/Guide and peerchange/delete/reopen; bothnode/mode real APIs/WSterminal. **NewAPI-F007-UNSAVED / AC010 REQ011 SCN006:** trusted native-input unsavedcd silently replaced by Bcommittedtext before reload/discard; priorabSave/readcontrol verifiesmodel. New durableFileExplorerTabs.unsaved.spec.ts no-peerPass/peerFail; existing2testsPass. No sourcefix. Origin reviewer decides implementation/baseline scope.\n- Initial Go7packages70top/212subPass,v etPass; Python50Pass3Skip; server23/publiccontracts12/Guide21/terminal109Pass. BroaderRequired after repository67.14. Final50/95/95/95/95/50/95 = **Fail{mean}%**.24Pass/2Fail ledgergroups, onefinding. No user-onlywaiver, Pass, delivery orrelease.\n- Harness corrections and allremainingrawattempts disclosed: Binterruptedmigrationfixture; stoppedruntimeports; refusalword; asymmetricownedlabels; confirmationhelperlostoriginalJSON (freshv2 completeproof, no reconstructedraw); LDdisplayUID vsbackingowner; childGit scopedtrust; administrative-lockstatus. Critical livefinding not explained away by these corrections.\n- L26cleanupComplete: exactVM/clone/nodes/registry/privatevolumes, own desktop/tunnel/tag/scratch/key/cache removed after preservationproof; priorpublicMaccache/IR005engine/generateddirectories retained. IV-D01–D04 deferredNOTPassed; publicrelease gatesunexecuted. Cumulativeaf9f23 successful-testreview stillawaitsgreenAPI. Fresh focusedfailure-origin route; no cumulativeindex forward. Evidence E7 and reportACproof govern.\n'''.replace('v etPass','vetPass'))
(E/'final-verdict.json').write_text(json.dumps({'result':'Fail','confidence':mean,'scores':score,'caseGroups':{'Pass':24,'Fail':2},'finding':'API-F007-UNSAVED','cleanup':'Complete','sourceChanged':False,'newDurableTest':'autobyteus-web/components/fileExplorer/__tests__/FileExplorerTabs.unsaved.spec.ts','testReview':'Failure-origin review requested; not successful-test review','broaderValidation':'Required and executed'},indent=2)+'\n')
print('Finalized Fail',mean)
