"""ARCH006 read-only package/source/raw-receipt audit; no product or VM execution."""
from pathlib import Path
import ast, datetime, hashlib, io, json, re, subprocess, tarfile
E=Path(__file__).resolve().parent; T=E.parents[1]; R=T.parents[2]
D=T/'evidence/design-recovery/sr022'; A=T/'evidence/api-e2e/api-rev-004'
BASE='4c66567ccacf6552e0f21af5c4e7f177c312f5c4'
def read(p): return json.loads(p.read_text())
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def git(*a): return subprocess.check_output(['git',*a],cwd=R)
owned={T/'design-review-report.md',T/'architecture-review-revision-record.md'}
refs=read(D/'package-index.json')['reference_files']; incoming=read(T/'code-review-evidence/crr-010/package-index.json')['reference_files']
assert len(refs)==len(set(refs))==1036 and len(incoming)==1003 and set(incoming)<=set(refs)
assert all(Path(p).is_file() for p in refs)
protected=read(D/'input-audit.json')['protected']; checked={p:h for p,h in protected.items() if Path(p) not in owned}
assert all(sha(p)==h for p,h in checked.items())
# Recheck all tracked incoming paths against accepted design commit, excluding current reviewer output.
tracked=set(git('ls-files').decode().splitlines()); compare=[]
for p in refs:
 p=Path(p); rel=str(p.relative_to(R))
 if p not in owned and rel in tracked:
  assert p.read_bytes()==git('show',BASE+':'+rel),rel
  compare.append(rel)
ret=read(A/'retained-input-audit.json')['files']
assert len(ret)==15 and all(sha(x['path'])==x['sha256'] and Path(x['path']).stat().st_size==x['size'] for x in ret)
for n in ['requirements-doc.md','approval-record-sr018.md','approval-record-sr017.md']:
 assert (T/n).read_bytes()==git('show','5251ab48bc:'+str((T/n).relative_to(R)))
source=read(D/'engine-source-check.json');assert sha(source['archive'])==source['sha256']
with tarfile.open(source['archive']) as outer:
 b=outer.extractfile(next(n for n in outer.getnames() if n.endswith('.orig.tar.gz'))).read()
 assert hashlib.sha256(b).hexdigest()==source['originalSHA256']
 with tarfile.open(fileobj=io.BytesIO(b)) as inner:
  for f in source['files']:
   b=inner.extractfile(f['member']).read();assert hashlib.sha256(b).hexdigest()==f['sha256']
   lines=b.decode().splitlines()
   for x in f['excerpts']: assert '\n'.join(lines[x['start']-1:x['end']])==x['text']
for x in source['primary']: assert sha(D/x['file'])==x['sha256']
p=read(D/'prototype-result.json');assert p['result'].startswith('Pass controlled')
assert len(p['commands'])==29 and all(c['rc']==0 for c in p['commands'])
assert p['candidate-zeroConfig']==p['originalConfig'].replace('EXPORT {','EXPORT {\n    Attr_Expiration_Time = 0;',1)
assert p['restored-defaultConfig']==p['originalConfig']
assert p['binary']['sha256'] in p['initial']['stdout'] and p['initial']['stdout'].count('4.3-8ubuntu1+autobyteus1 arm64')==2
assert '\nY\n' in p['initial']['stdout'] and '7.0.0-38' in p['initial']['stdout']
rows=0; phases=[]
for phase in p['phases']:
 assert phase==read(D/(phase['phase']+'.json'))
 assert (phase['uid'],phase['gid'],phase['groups'])==(1000,109,[])
 assert len(set(phase['markers']))==1 and json.loads(phase['markers'][0])['storageId']==p['connection']['storageId']
 for c in phase['cases']:
  assert c['sourceHash']==c['newHash']!=c['oldHash']; rows+=len(c['observations'])
  first=[None,None]
  for row in c['observations']:
   for i,v in enumerate(row['reads']):
    assert v['endSeconds']>=v['startSeconds']
    if v.get('sha256')==c['newHash'] and first[i] is None: first[i]=v['endSeconds']
  assert first==c['firstExact']
  if c['kind']=='inplace': assert c['sourceBefore']==c['sourceAfter']
  if phase['phase']=='candidate-zero': assert all(x is not None and x<=5 for x in first)
  else:
   assert first==[None,None] and c['observations'][-1]['endSeconds']>5
   assert all(v['sha256']==c['oldHash'] for row in c['observations'] for v in row['reads'])
  phases.append({'phase':phase['phase'],'case':c['name'],'firstExact':first,'rows':len(c['observations'])})
assert rows==127
identity=p['freshAbsence']['stdout'].strip()
assert p['preservation']['stdout'].splitlines()[0]==p['detachedPreservation']['stdout'].splitlines()[0]==identity
assert 'ORIGINAL_SR022ORIGINAL_SR022' in p['preservation']['stdout'] and 'ORIGINAL_SR022' in p['detachedPreservation']['stdout']
assert json.loads(p['restoredPublicReconnect']['stdout'])['hostReady'] and p['publicDetach']['rc']==0
cleanup=read(D/'cleanup.json'); assert cleanup['result']=='Complete' and cleanup['privateScratchAbsent'] and cleanup['vmPidAbsent'] and not Path(cleanup['scratch']).exists()
v=read(A/'visibility-repro-result.json')['reproduction'];api_rows=0;trials=[]
for t in v['trials']:
 assert t['sourceFileInodeUnchanged'] and t['sourceMtimeNsAfter']!=t['sourceMtimeNsBefore'] and t['sourceSHAAfter']==t['expectedSHA']
 api_rows+=len(t['rows'])
 for reader in ['native','http']:
  first=next(row['seconds'] for row in t['rows'] if row[reader+'SHA']==t['expectedSHA'])
  assert first==t['freshAtSeconds'][reader] and first>5
  assert all(row[reader+'SHA']==t['initialSHA'] for row in t['rows'] if row['seconds']<first)
 trials.append({'file':t['file'],'freshAt':t['freshAtSeconds'],'rows':len(t['rows'])})
assert api_rows==243
b=read(A/'two-reboots-result.json');assert b['result']=='Pass' and len(b['boots'])==2
assert b['boots'][0]['newBoot']==b['boots'][1]['oldBoot']
assert len({b['boots'][0]['oldBoot'],*(x['newBoot'] for x in b['boots'])})==3
for x in b['boots']:
 assert '"status":"ok"' in x['readiness']['health']['stdout']
 assert json.loads(x['readiness']['status']['stdout'])['hostReady']
commands=[' '.join(c['argv']) for c in b['commands']]
assert not any(re.search(r'docker\s+(?:start|restart)\b|\sreconnect\s',x) for x in commands)
for k in ['Id','Image','Config']:assert b['before'][k]==b['lastInspect'][k]
hc_before=dict(b['before']['HostConfig']);hc_after=dict(b['lastInspect']['HostConfig'])
assert {k for k in hc_before.keys()|hc_after.keys() if hc_before.get(k)!=hc_after.get(k)}=={'Dns'}
assert hc_before['Dns'] is None and hc_after['Dns']==[]
hc_before['Dns']=[];assert hc_before==hc_after
controls={n:read(A/(n+'-result.json'))['result'] for n in ['normal-stop','policy-veto','node-upgrade','drained-detach-confirm']}
assert all(v=='Pass' for v in controls.values())
aggregate=subprocess.check_output(['python3','autobyteus-nfs/packaging/release.py','--source-hash'],cwd=R,text=True).strip()
assert aggregate=='968f6d000d4b6c2cc3c66cd3add5845cb30385cdad752fe831b564823db9b764'
lock=read(R/'autobyteus-nfs/packaging/release-lock.json');assert lock['qualifiedTargets']==[] and not lock['qualifiedSourceHash'] and not lock['userVerified'] and lock['engine'] is None
changed=git('diff','--name-only',BASE).decode().splitlines()
assert all(R/x in owned or str(R/x).startswith(str(E)+'/') for x in changed),changed
history=(T/'architecture-review-revision-record.md').read_text()
history=re.sub(r'\n\| ARCH-REV-006 \|[^\n]*\n', '', history, count=1)
assert history.encode().startswith(git('show',BASE+':'+str((T/'architecture-review-revision-record.md').relative_to(R))))
for x in E.glob('*.py'):ast.parse(x.read_text())
subprocess.run(['git','diff','--check',BASE],cwd=R,check=True)
r={'round':'ARCH-REV-006','date':datetime.datetime.now(datetime.timezone.utc).isoformat(),'input':BASE,'scope':'Personal static source, raw-receipt and integrity audit only. No reviewer build/test/VM or live resource operation. Inherited experiment is dependency feasibility, not public correction qualification.','referenceCount':len(refs),'incomingRetained':len(incoming),'protectedDesignerInputPaths':len(checked),'trackedInputPathsCompared':len(compare),'retainedCandidateFiles':len(ret),'approvedBasisUnchanged':True,'exactEngineMembers':len(source['files']),'sourceArchiveSHA256':source['sha256'],'primarySources':source['primary'],'prototypeObservationRows':rows,'prototypePhases':phases,'sourceIdentity':identity,'storageUUID':p['connection']['storageId'],'prototypeCleanup':'Complete receipt; private scratch absent','api004FailureRows':api_rows,'api004Trials':trials,'api004Boots':[{'oldBoot':x['oldBoot'],'newBoot':x['newBoot'],'secondsToObservedReady':x['secondsToObservedReady']} for x in b['boots']],'api004NoManualStartReconnectInTwoBoots':True,'api004HostConfigDifference':'Only Dns null -> []; preserved semantic empty-DNS normalization already explicit in raw harness, not byte equality','api004PriorControls':controls,'productionAggregate':aggregate,'currentApiResult':'API004 Fail57.14% / broader Required','currentSourceReview':'CRR010 Fail','changedTracked':changed,'priorHistoryPreservedExceptCurrentIndexAddition':True,'pass':True}
(E/'review-checks.json').write_text(json.dumps(r,indent=2)+'\n')
print(json.dumps({k:r[k] for k in ['pass','referenceCount','protectedDesignerInputPaths','trackedInputPathsCompared','retainedCandidateFiles','exactEngineMembers','prototypeObservationRows','api004FailureRows','productionAggregate']}))
