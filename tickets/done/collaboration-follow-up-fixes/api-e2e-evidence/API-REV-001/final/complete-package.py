import pathlib,json,hashlib,subprocess,datetime,tarfile,decimal
F=pathlib.Path(__file__).resolve().parent;E=F.parent;T=E.parent.parent
base=json.loads((E/'entry-baseline.json').read_text());W=pathlib.Path(base['worktree'])
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def git(*args):return subprocess.check_output(['git',*args],cwd=W,text=True).strip()
def write(p,o):p.write_text(json.dumps(o,indent=2)+'\n')
rule={'when':'When API/E2E validation passes, the carried classification is task_size=Large or architectural_risk=High, and the cumulative evidence package requires proportional test-code review.','recipient_address':'/software_engineering_team/code_reviewer'}
write(F/'selected-handoff-rule.json',{'retrievedAt':now,'tool':'get_handoff_rules','selected':rule,'otherRules':[{'when':'When API/E2E validation fails and the complete failure package requires focused failure-origin review by the code reviewer.','recipient_address':'/software_engineering_team/code_reviewer'},{'when':'When API/E2E validation passes on the direct route, the carried classification is task_size=Small or Medium and architectural_risk=Low, no durable test-code review is required by policy, and the complete validated package is ready for delivery, documentation sync, finalization, or release work.','recipient_address':'/software_engineering_team/delivery_engineer'}],'evaluation':{'result':'Pass','task_size':'Medium','architectural_risk':'High','route':'Reviewed','durableChanges':[],'proportionalTestCode':'Not Applicable — Reviewer to record in separate report'},'sent':False})
# Re-entry diagnostics are not product attempts or new acceptance rounds.
q=json.loads((F/'user-tool-choice.json').read_text())
q['reportingDiscoveryCorrection']='Read-only instruction existence probe initially computed workspace one parent too shallow (tickets/), returned false without assertion; repeated using entry-baseline.worktree, all five real instruction files exist. Canonical report paths were correct throughout.'
write(F/'user-tool-choice.json',q)
required=['requirements-doc.md','investigation-notes.md','requirements-revision-record.md','design-spec.md','architecture-investigation.md','architecture-design-self-validation.md','architecture-design-revision-record.md','design-review-report.md','architecture-review-revision-record.md','implementation-handoff.md','implementation-revision-record.md','code-review-report.md','code-review-revision-record.md','api-e2e-coverage-investigation.md','api-e2e-execution-coverage-report.md','api-e2e-test-case-ledger.md','api-e2e-revision-record.md']
assert all((T/p).is_file() for p in required)
# All regular tracked files plus the separately hashed absolute incoming witnesses.
changed=[];missing=[]
for name,expected in base['protected'].items():
 p=pathlib.Path(name) if name.startswith('/') else W/name
 if not p.is_file():missing.append(name)
 elif sha(p)!=expected:changed.append(name)
assert not missing and not changed,(missing,changed)
source_commit='5710fdd5347bb1b3c464775dd9e32470c88a2ef5'
source_paths=git('diff-tree','--no-commit-id','--name-only','-r',source_commit).splitlines()
assert len(source_paths)==39
source_hashes={}
for name in source_paths:
 b=subprocess.check_output(['git','show',source_commit+':'+name],cwd=W)
 assert (W/name).read_bytes()==b,name
 source_hashes[name]=hashlib.sha256(b).hexdigest()
write(F/'source-integrity.json',{'sourceCommit':source_commit,'paths':source_hashes,'verified':39,'apiSourceOrDurableChanges':[]})
archive=json.loads((F/'runtime-archive-manifest.json').read_text())
assert sha(pathlib.Path(archive['archive']))==archive['archiveSha256']
with tarfile.open(archive['archive']) as tf:
 members={m.name:m for m in tf.getmembers() if m.isfile()}
 assert set(members)=={a['path'] for a in archive['files']}
 for a in archive['files']:
  m=members[a['path']]
  assert hashlib.sha256(tf.extractfile(m).read()).hexdigest()==a['sha256']
  assert m.mode==a['mode']
  assert decimal.Decimal(m.pax_headers['mtime'])*1000000000==a['mtimeNs']
assert not pathlib.Path('/tmp/collab-api01-yyjdm4jz').exists()
cleanup=json.loads((F/'process-cleanup.json').read_text())
still_owned=[]
for pid in cleanup['ownedRoots']:
 p=pathlib.Path('/proc')/str(pid)/'cmdline'
 if p.exists():
  cmd=p.read_text().replace('\x00',' ')
  if 'collab-api01' in cmd or '--port 3611' in cmd:still_owned.append({'pid':pid,'cmd':cmd})
assert not still_owned
status=git('status','--porcelain=v1');assert not git('diff','--cached','--name-only') and not git('ls-files','-u')
assert not git('diff','--name-only')
assert git('rev-parse','HEAD')==base['head']
source_credential=pathlib.Path('/root/.autobyteus/server-data/.env')
assert sha(source_credential)=='1907572cef67b8770dc3f68c51b71f26d5d9b858ceab55a6de302a5d0a24d807'
for n in ['org-unused-result.json','org-first-work-result.json','native-first-result.json','native-reopen-result.json','team-restore-result.json']:
 d=json.loads((E/'live'/n).read_text());assert all(d['checks'].values()),n
case=json.loads((F/'case-reconciliation.json').read_text());assert len(case['cases'])==11 and all(c['result']=='Pass' for c in case['cases'])
for l in (F/'visual-inspection.md').read_text().splitlines():
 if l.startswith('- live/'):assert (E/l[2:]).is_file()
write(F/'final-validation.json',{'at':now,'revision':'API-REV-001','round':1,'priorResult':'N/A','priorConfidence':'N/A','result':'Pass','confidence':95.0,'postRepositoryConfidence':80.7,'cases':{'Pass':11,'Fail':0,'Blocked':0,'NotTested':0},'repository':{'files':30,'tests':223,'server':[11,56],'web':[19,167]},'broaderValidation':'Required — completed real browser/server/provider/lifecycle','durableAdded':[],'durableUpdated':[],'durableRemoved':[],'originalNavigationCause':'UNASSIGNED; no historical-fix attribution','native':'Real AutoByteus/deepseek-v4-flash text journey, actual clicked final200/original bytes, one input, normal reopen','userToolDecision':'No redundant open_tab testing','recipient':rule['recipient_address'],'stage':'Completed validation; handoff pending tool confirmation'})
write(E/'LAST-CHECKPOINT.json',{'at':now,'revision':'API-REV-001','state':'Completed validation and final integrity; handoff pending tool confirmation','result':'Pass','confidence':95,'cases':11,'remainingProductTests':0,'durableChanges':[]})
# Complete core authorities as original canonical attachments; detailed witnesses travel through one lookup index.
upstream=(T/'code-review-evidence/CRR-001/handoff-reference-files.txt').read_text().splitlines()
assert len(upstream)==224 and all(pathlib.Path(x).is_file() for x in upstream)
new_targets=[F/'handoff-reference-files.txt',F/'evidence-manifest.json',F/'completion-integrity.json']
refs=sorted(set(upstream+[str(T/p) for p in required]+[str(p) for p in E.rglob('*') if p.is_file()]+[str(p) for p in new_targets]))
(F/'handoff-reference-files.txt').write_text('\n'.join(refs)+'\n')
write(F/'completion-integrity.json',{'at':now,'result':'Pass','head':base['head'],'headUnchanged':True,'protectedCount':len(base['protected']),'changed':changed,'missing':missing,'incomingReferences':224,'allIncomingPreserved':True,'sourceAndTestsAtCommit':39,'trackedChanges':[],'stagedChanges':[],'unmerged':[],'gitStatus':status,'ownedRootRemoved':True,'ownedProcessesRemaining':still_owned,'archiveFilesByteModeMtimeVerified':len(archive['files']),'sourceCredentialUnchanged':True,'secretScanAtCleanup':json.loads((F/'cleanup-integrity.json').read_text())['secretInEvidence'],'newReportFilesContainNoCredentialProvisioningData':True,'lookupReferences':len(refs),'round':1,'apiDurableChanges':[],'upstreamVueTypecheck':'Fail exit2, not rerun/reclassified','historicalNavigationCause':'UNASSIGNED','handoff':'Pending tool confirmation'})
assert all(pathlib.Path(p).is_file() or p==str(F/'evidence-manifest.json') for p in refs)
manifest={str(p):{'sha256':sha(p),'bytes':p.stat().st_size} for p in sorted([*(T/n for n in required[-4:]),*(p for p in E.rglob('*') if p.is_file() and p.name!='evidence-manifest.json')])}
write(F/'evidence-manifest.json',{'at':now,'scope':'Four canonical API records and all current API evidence except this self-referential manifest. Upstream224 witnesses pinned separately by entry-baseline/source-integrity. Transport handoff receipt, if added later, is not retroactively claimed included.','files':manifest})
assert all(pathlib.Path(p).is_file() for p in refs)
print(json.dumps({'result':'Pass','protected':len(base['protected']),'sourceTestFiles':39,'references':len(refs),'manifestFiles':len(manifest),'archiveFiles':len(archive['files']),'requiredCanonicalAttachments':len(required)}))
