from pathlib import Path
import subprocess,json,hashlib,shutil,re,datetime
E=Path(__file__).resolve().parent;R=E.parents[5];T=E.parents[2]
S=Path((E/'scratch-path.txt').read_text().strip());assert S.name.startswith('ab-nfs-api009-') and S.parent!=R
D=json.loads((E/'checks-result.json').read_text());assert D.get('executionFinished') and all(c['exitCode']==0 for c in D['checks'])
A=json.loads((E/'input-audit.json').read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
paths=subprocess.check_output(['git','ls-files','-z'],cwd=R,text=True).split('\0')
def aggregate(root):
 h={p:sha(root/p) for p in paths if p and not p.startswith('tickets/') and (root/p).is_file()}
 return {'count':len(h),'sha256':hashlib.sha256(json.dumps(h,sort_keys=True,separators=(',',':')).encode()).hexdigest()}
sourceAfter=aggregate(R);testedSource=aggregate(S/'repo')
assert sourceAfter['sha256']==A['trackedSourceAggregate'];assert testedSource==sourceAfter
protected={p:sha(R/p) for p in A['protectedArtifacts']};assert protected==A['protectedArtifacts']
counts={}
for c in D['checks']:
 text=(E/c['log']).read_text();f=re.findall(r'Test Files\s+(\d+) passed',text);t=re.findall(r'Tests\s+(\d+) passed',text)
 if t:counts[c['name']]={'files':int(f[-1]),'passed':int(t[-1])}
 c['logSha256']=sha(E/c['log'])
assert counts=={'workspace-rest':{'files':1,'passed':6},'workspace-unit':{'files':9,'passed':48},'adjacent-explorer':{'files':2,'passed':12},'workspace-rest-repeat':{'files':1,'passed':6}},counts
raw=subprocess.check_output(['ps','-axo','pid=,ppid=,command='],text=True)
owned=[l.strip() for l in raw.splitlines() if str(S) in l or str(S.resolve()) in l]
assert not owned,owned
cwd=subprocess.run(['lsof','-nP','-d','cwd','-Fpn'],capture_output=True,text=True)
ownedCwd=[];pid=None
for l in cwd.stdout.splitlines():
 if l.startswith('p'):pid=l[1:]
 if l.startswith('n') and (l[1:]==str(S) or l[1:].startswith(str(S)+'/') or l[1:].startswith(str(S.resolve())+'/')):ownedCwd.append({'pid':pid,'cwd':l[1:]})
assert not ownedCwd,ownedCwd
entries=[p.name for p in (S/'tmp').iterdir()];db=[str(p.relative_to(S)) for p in (S/'repo/autobyteus-server-ts/tests/.tmp').glob('*')]
receipt={'time':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scratch':str(S),'ownedProcessesBeforeCleanup':owned,'ownedWorkingDirectoriesBeforeCleanup':ownedCwd,'fixtureDirectoriesAlreadyRemoved':D['restCleanupAfterFirst']==[] and D['restCleanupAfterRepeat']==[],'remainingOwnedTempEntries':entries,'ownedTestDatabaseFiles':db,'sourceOriginalAfter':sourceAfter,'testedArchiveAfter':testedSource,'protectedArtifactsUnchanged':len(protected),'preexistingDistFiles':286,'retainedEngineFiles':8,'noRuntimeResourcesCreated':'No VM/Docker/browser/installed-app/provider/host-network operations. Only test-owned loopback listeners in terminated Vitest processes.'}
shutil.rmtree(S);receipt['scratchRemoved']=not S.exists();assert receipt['scratchRemoved']
(E/'cleanup.json').write_text(json.dumps(receipt,indent=2)+'\n');(E/'checks-result.json').write_text(json.dumps(D,indent=2)+'\n')
summary={'result':'Pass','confidence':95,'scope':'API009 affected integrated repository fixture/lifecycle/search validation; API008 FS01-17 command-only Pass95 carried separately','cases':{f'INT{i:02}':'Pass' for i in range(1,7)},'counts':counts,'uniqueTests':66,'uniqueFiles':12,'additionalRepeatTests':6,'broaderValidation':'Not Required for this repository-only reconciliation; actual changed lifecycle and socket boundaries executed, no new kernel/browser gap','categoryScores':[95,95,95,95,95,None,95],'userSurfaceCategory':'N/A no new browser/desktop surface; CLI proof remains API00895','cleanup':'Complete','currentSource':A['head'],'historicalResults':'API008 Pass95 filesystem, API007 combined Fail82.14, API006 Blocked67.86 preserved; DR001 remains Delivery owner verdict','followUp':'CR-FUP002 unresolved/nonblocking Task project_task_a4f90984-add2-4300-983d-de54ded3032b; no retest or new live editor closure'}
(E/'final-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
p=T/'api-e2e-test-case-ledger.md';text=p.read_text();lines=text.splitlines()
for i,l in enumerate(lines):
 if l.startswith('| INT06 |'):
  fields=l.split('|');fields[3]=' Pass ';fields[4]=' E9/cleanup.json; current source and294 protected artifacts intact; owned scratch gone ';lines[i]='|'.join(fields)
text='\n'.join(lines)+'\n';text=text.replace('<!-- API009 events end -->',f"- {receipt['time']} **INT06 Pass** — cleanup/source identity checked; E9/cleanup.json and final-summary.json. All INT01–06 Pass;66 unique tests/12files plus6 repeat.\n\n<!-- API009 events end -->");p.write_text(text)
print(json.dumps(summary,indent=2))
