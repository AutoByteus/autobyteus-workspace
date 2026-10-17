"""Authoring/evidence integrity audit, not source implementation or product qualification."""
from pathlib import Path
import json,hashlib,subprocess as sp,datetime,ast
E=Path(__file__).resolve().parent;T=E.parents[2];R=T.parents[2]
def read(p):return json.loads(p.read_text())
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def git(*args):return sp.check_output(['git',*args],cwd=R,text=True)
a=read(E/'input-audit.json');inc=read(T/'code-review-evidence/crr-010/package-index.json')['reference_files'];owned=set(a['ownedBefore'])
missing=[x for x in inc if not Path(x).is_file()];changed=[p for p,h in a['protected'].items() if not Path(p).is_file() or sha(p)!=h]
ret=read(T/'evidence/api-e2e/api-rev-004/retained-input-audit.json')['files'];retbad=[x['path'] for x in ret if not Path(x['path']).is_file() or sha(x['path'])!=x['sha256'] or Path(x['path']).stat().st_size!=x['size']]
files=[p for p in E.rglob('*') if p.is_file()];syntax=[]
for p in files:
 if p.suffix=='.py':ast.parse(p.read_text());syntax.append(str(p))
 if p.suffix=='.json':read(p)
p=read(E/'prototype-result.json');assert p['result'].startswith('Pass controlled')
ident=p['freshAbsence']['stdout'].strip();assert p['preservation']['stdout'].splitlines()[0]==p['detachedPreservation']['stdout'].splitlines()[0]==ident
assert 'ORIGINAL_SR022ORIGINAL_SR022' in p['preservation']['stdout'];assert 'ORIGINAL_SR022' in p['detachedPreservation']['stdout']
assert p['candidate-zeroConfig']==p['originalConfig'].replace('EXPORT {','EXPORT {\n    Attr_Expiration_Time = 0;',1)
assert p['restored-defaultConfig']==p['originalConfig']
assert p['initial']['stdout'].count('4.3-8ubuntu1+autobyteus1 arm64')==2 and '\nY\n' in p['initial']['stdout'] and '7.0.0-38' in p['initial']['stdout']
assert p['binary']['sha256'] in p['initial']['stdout'];assert p['publicDetach']['rc']==0 and json.loads(p['restoredPublicReconnect']['stdout'])['hostReady']
raw=0
for phase in p['phases']:
 assert phase['uid']==1000 and phase['gid']==109 and phase['groups']==[]
 ident2=':'.join(map(str,phase['sourceIdentity'][:4]))+':'+oct(phase['sourceIdentity'][4])[2:];assert ident2==ident
 assert all(json.loads(m)['storageId']==p['connection']['storageId'] for m in phase['markers'])
 for c in phase['cases']:
  assert c['sourceHash']==c['newHash'] and c['oldHash']!=c['newHash'];raw+=len(c['observations'])
  if c['kind']=='inplace':assert c['sourceBefore']==c['sourceAfter']
  if phase['phase']=='candidate-zero':assert c['withinFiveSeconds'] and all(x is not None and x<=5 for x in c['firstExact'])
  else:
   assert not c['withinFiveSeconds'] and c['firstExact']==[None,None] and c['observations'][-1]['endSeconds']>5
   assert all(v['sha256']==c['oldHash'] for row in c['observations'] for v in row['reads'])
assert read(E/'cleanup.json')['result']=='Complete' and not Path(read(E/'resource.json')['scratch']).exists()
assert sha(E/'prior-solution-design-handoff-sr021.md')==a['ownedBefore'][str(T/'solution-design-handoff.md')]
hist=sp.check_output(['git','show',a['head']+':'+str((T/'solution-revision-record.md').relative_to(R))],cwd=R);prefix=(T/'solution-revision-record.md').read_bytes().startswith(hist)
delta=git('diff','--name-only',a['head']).splitlines();unexpected=[x for x in delta if str(R/x) not in owned and not str(R/x).startswith(str(E)+'/')]
w=sp.run(['git','diff','--check',a['head']],cwd=R,capture_output=True,text=True)
ag=sp.run(['python3','autobyteus-nfs/packaging/release.py','--source-hash'],cwd=R,capture_output=True,text=True);want='968f6d000d4b6c2cc3c66cd3add5845cb30385cdad752fe831b564823db9b764'
extras=[R/'autobyteus-nfs/internal/backend/backend_test.go',R/'autobyteus-nfs/internal/backend/cleanup_test.go']
refs=sorted(set(inc)|owned|{str(x) for x in files}|{str(x) for x in extras}|{str(E/x) for x in ['final-audit.json','package-index.json','routing.json']})
index={'round':'SR022','result':'Architecture Design Complete','approval':'Unchanged Approved SR018','task_size':'Large','architectural_risk':'High','finding':'CRR010 / CR006 P1 / API-F004','entryPoint':str(T/'solution-design-handoff.md'),'incomingCount':len(inc),'referenceCount':len(refs),'reference_files':refs,'limits':'Dependency comparison and source/authoring audit only; API004 Fail and CRR010 Fail remain; no corrected public-command, managedDocker/physical/full validation or release claim.'}
(E/'package-index.json').write_text(json.dumps(index,indent=2)+'\n')
r={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'head':git('rev-parse','HEAD').strip(),'basis':a['head'],'branch':git('branch','--show-current').strip(),'incomingCount':len(inc),'incomingMissing':missing,'protectedCount':len(a['protected']),'protectedChanges':changed,'retainedCandidateCount':len(ret),'retainedCandidateChanges':retbad,'sourceIdentity':ident,'storageId':p['connection']['storageId'],'rawObservationRowsAudited':raw,'prototypeResult':p['result'],'cleanup':'Complete','historyPrefixPreserved':prefix,'trackedChangedPaths':delta,'unexpectedTrackedChanges':unexpected,'whitespace':{'exit':w.returncode,'stdout':w.stdout,'stderr':w.stderr},'productionAggregate':{'exit':ag.returncode,'actual':ag.stdout.strip(),'expected':want,'stderr':ag.stderr},'referenceCount':len(refs),'pythonParsed':syntax,'ownedHashes':{x:sha(x) for x in owned},'status':git('status','--short'),'scope':'Only four owned canonical documents and SR022 evidence. No implementation/test/requirements/approval/specialist edit, engine build, user live resource, release/merge/push/tag/TaskDone.'}
r['pass']=not(missing or changed or retbad or unexpected or w.returncode or ag.returncode) and ag.stdout.strip()==want and prefix
(E/'final-audit.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({k:r[k] for k in ['pass','incomingCount','protectedCount','retainedCandidateCount','rawObservationRowsAudited','referenceCount','unexpectedTrackedChanges']}))
assert r['pass']
