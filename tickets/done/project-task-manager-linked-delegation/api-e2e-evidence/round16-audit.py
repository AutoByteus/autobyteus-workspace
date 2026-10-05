from pathlib import Path
import json,hashlib,subprocess,datetime
E=Path(__file__).resolve().parent;T=E.parent;W=T.parents[2]
def read(n):return json.loads((E/n).read_text())
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def git(*args):return subprocess.check_output(['git',*args],cwd=W).decode().strip()
base=read('api-016-input-preservation.json'); changed='autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts'
owned={str(T/n) for n in ['api-e2e-coverage-investigation.md','api-e2e-execution-coverage-report.md','api-e2e-revision-record.md','api-e2e-test-case-ledger.md']}|{str(W/changed)}
refs=[p for p,h in base['references'].items() if sha(p)!=h];assert not set(refs)-owned,refs
assert git('rev-parse','HEAD')==base['head'];assert git('branch','--show-current')==base['branch'];assert git('rev-parse','refs/stash')==base['stash']
assert hashlib.sha256(subprocess.check_output(['git','ls-files','--stage','-z'],cwd=W)).hexdigest()==base['stagesSha256']
assert not git('ls-files','-u');dirtyDiff=[p for p,r in base['dirty'].items() if sha(W/p)!=r['sha256']];assert dirtyDiff==[changed],dirtyDiff
p=read('api-015-artifact-provenance.json');mismatches=[]
for f,v in {**p['source'],**p['built']}.items():
 if sha(f)!=v['sha256']:mismatches.append(f)
for r in p['rows']:
 for f,h in [(W/'autobyteus-server-ts/dist'/r['relative'],r['currentSha256']),(Path(p['resources'])/'server/dist'/r['relative'],r['packagedSha256'])]:
  if sha(f)!=h:mismatches.append(str(f))
assert not mismatches,mismatches; assert sha(Path(p['resources'])/'app.asar')==p['appAsarSha256']
a=read('api-015-owned-evidence-manifest.json');assert all(sha(f['archive'])==f['sha256'] for f in a['files'])
c=read('api-015-cleanup-verification.json');assert all(c[k] for k in ['recordAbsent','dataRootAbsent','foreignRecordsUnchanged']);assert all(c['portsFreeBind'].values());assert not c['capturedOwnPidsStillPresent'] and not c['archiveMismatches'];assert not c['observerInstalled']
phys=read('api-015-retained-physical.json');ids=set(phys['beforeIds']);assert len(ids)==8 and ids==set(phys['afterIds']);assert len(set(phys['actualSDKPids']))==8 and not phys['physicalStillAlive'];assert len(phys['protectedSDK'])==9
assert {i for b in phys['bindings'] for i in b['ownerBinding']['runIds']}==ids
assert {p for b in phys['bindings'] for p in b['value']['pids']}==set(phys['actualSDKPids'])
assert len(phys['receipts'])==8
for r in phys['receipts']:
 assert r['value']['cancelled'];assert all(x['status']=='fulfilled' for x in r['value']['results'])
 for s in r['value']['receipts']:assert all(s[k] for k in ['spawned','physicalExit','nodeClosed','stderrClosed','sdkExitDelivered','releaseProof']) and not s['creationFailed']
for key in ['componentProofs','inputProofs']:assert {r['value']['runId'] for r in phys[key]}==ids
for r in phys['componentProofs']:
 assert set(r['value']['proof'])=={'skills','mcp','listeners','process'};assert all(x['status']=='fulfilled' for x in r['value']['results'])
for r in phys['inputProofs']:
 v=r['value'];assert not v['activeDispatch'] and not v['uncertainDispatch'] and not v['input']['accepting'] and not v['input']['entries'];assert v['canonical']['activeTurn']['kind']=='NONE'
for n in ['api-015-claude-canonical-terminal-proof.json','api-015-Claude-Team-terminal-proof.json']:
 d=read(n)
 for v in d['canonical'].values():
  assert v['lastStatus']['status']=='offline';assert not (v.get('lastInputState') or v.get('lastInput'))['entries']
 assert any(v['turnInterrupted'] for v in d['canonical'].values())
restart=read('api-015-whole-app-restart-proof.json');assert restart['sameOwnedProfilePortsExecutable'] and restart['allOldCapturedPidsGone'] and restart['oldInspectorBackendGone'];assert restart['oldAppPid']!=restart['newAppPid'];assert read('api-015-claude-resume.json')['rendererRetainedConversationAndNewReply']
old13=read('api-013-input-preservation.json')['dirty'];diff13=[p for p,r in old13.items() if p in base['dirty'] and r['sha256']!=base['dirty'][p]['sha256']]
allowed13=['autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-cleanup.ts','autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts','autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-cleanup.test.ts'];assert set(diff13)==set(allowed13),diff13
inv=read('api-015-coverage-inventory.json');hashes={p:sha(W/p) for p in inv['retainedCumulativePaths']};assert len(hashes)==20;assert [p for p,h in hashes.items() if h!=inv['currentHashes'][p]]==[changed]
out={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'authority':'REQ-BL-008 / semantic SR-014 / ARCH-REV-005 / IR-010 / CRR-020 source Pass','referencesChecked':len(base['references']),'authorizedChangedReferences':refs,'nonTicketDirtyChecked':len(base['dirty']),'authorizedDirtyChanges':dirtyDiff,'headBranchStashAndStagesExact':True,'indexBytesExact':sha(W/git('rev-parse','--git-path','index'))==base['indexSha256'],'packagedIR010SourceAndBuiltHashesExact':True,'all1452CompiledAndPackagedJSExact':True,'asarExact':True,'archive46HashesExact':True,'priorOwnedCleanupVerified':True,'eightExactPhysicalIOComponentInputOwnersVerified':True,'uninstrumentedOrgTeamCanonicalVerified':True,'wholeAppSameWorkerManagerResumeVerified':True,'api13ChangesOnlyClaudeLocalCorrection':diff13,'durablePaths':list(hashes),'durableHashes':hashes,'durableChanges':[changed],'limits':['Reassessment of exact retained executable evidence, not new paid provider executions','Physical captures are instrumented, not original FAPI-011 cause or universal ownership','API-13 Native/Codex named paths remain narrow; no all-model matrix','Original FAPI-007 Open / Unclear / Not Reproduced unchanged']}
(E/'api-016-fidelity-and-evidence-audit.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({k:v for k,v in out.items() if k not in ['durableHashes','durablePaths','authorizedChangedReferences']}))
