"""Read-only authoring/integrity audit; does not run product tests or live operations."""
from pathlib import Path
import datetime, hashlib, json, subprocess
E=Path(__file__).resolve().parent
T=E.parents[2]
R=T.parents[2]
def read(p): return json.loads(p.read_text())
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def git(*args): return subprocess.check_output(['git',*args],cwd=R,text=True)
a=read(E/'input-audit.json')
inc=read(T/'code-review-evidence/crr-008/package-index.json')['reference_files']
missing=[p for p in inc if not Path(p).is_file()]
changed=[p for p,h in a['protected'].items() if not Path(p).is_file() or sha(p)!=h]
ret=read(T/'implementation-evidence/ir-005/retained-candidate.json')['files']
retbad=[r['path'] for r in ret if not Path(r['path']).is_file() or sha(r['path'])!=r['sha256'] or Path(r['path']).stat().st_size!=r['size']]
owned=set(a['ownedBefore'])
delta=git('diff','--name-only',a['head']).splitlines()
unexpected=[p for p in delta if str(R/p) not in owned]
whitespace=subprocess.run(['git','diff','--check'],cwd=R,text=True,capture_output=True)
aggregate=subprocess.run(['python3','autobyteus-nfs/packaging/release.py','--source-hash'],cwd=R,text=True,capture_output=True)
expected='4568593b99bb3dff263e9824ceb7176e04a95ec90e3cd14a9f7421b4e43055ac'
oldhistory=subprocess.check_output(['git','show',a['head']+':'+str((T/'solution-revision-record.md').relative_to(R))],cwd=R)
historyprefix=(T/'solution-revision-record.md').read_bytes().startswith(oldhistory)
extras=[R/p for p in [
'autobyteus-nfs/internal/cli/inputs.go','autobyteus-nfs/internal/cli/launcher.go',
'autobyteus-nfs/internal/config/store.go','autobyteus-nfs/internal/docker/client.go',
'autobyteus-nfs/internal/docker/ownership.go','autobyteus-nfs/internal/docker/recovery.go',
'autobyteus-nfs/internal/docker/exec.go','autobyteus-nfs/internal/setup/pending.go',
'autobyteus-nfs/internal/setup/detach_nodes.go',
'scripts/public/docker/autobyteus-docker.d/bash/commands.sh',
'scripts/public/docker/autobyteus-docker.d/bash/nfs-attachment.sh']]
assert all(p.is_file() for p in extras)
refs=sorted(set(inc)|owned|{str(p) for p in extras}|{str(p) for p in E.iterdir() if p.is_file()}|{str(E/n) for n in ['package-index.json','final-audit.json','routing.json']})
index={'round':'SR021','result':'Architecture Design Complete','status':'Ready; independent architecture re-review required','approval':'Unchanged Approved SR018','taskSize':'Large','architecturalRisk':'High','finding':'CRR008 / CR005 P1 / API-F003','entryPoint':str(T/'solution-design-handoff.md'),'incomingCount':len(inc),'referenceCount':len(refs),'reference_files':refs,'limits':'Authoring/source/raw-evidence audit only. No new product/runtime/UI/VM/suite validation; API003 Fail and CRR008 Fail remain. Full cumulative incoming chain retained.'}
(E/'package-index.json').write_text(json.dumps(index,indent=2)+'\n')
r={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'head':git('rev-parse','HEAD').strip(),'basis':a['head'],'branch':git('branch','--show-current').strip(),'incomingCount':len(inc),'incomingMissing':missing,'protectedCount':len(a['protected']),'protectedChanges':changed,'retainedCandidateCount':len(ret),'retainedCandidateChanges':retbad,'trackedChangedPaths':delta,'unexpectedTrackedChanges':unexpected,'historyPrefixPreserved':historyprefix,'whitespace':{'exit':whitespace.returncode,'output':whitespace.stdout+whitespace.stderr},'productionAggregate':{'exit':aggregate.returncode,'actual':aggregate.stdout.strip(),'expected':expected,'stderr':aggregate.stderr},'ownedHashes':{p:sha(p) for p in sorted(owned)},'extraSourceHashes':{str(p):sha(p) for p in extras},'referenceCount':len(refs),'status':git('status','--short'),'runtimeValidation':'Not run by Solution Designer in SR021; inherited API003 evidence remains scoped to its owner.','liveResources':'None created or modified by SR021; no cleanup required.','scope':'Owned canonical design/investigation/history/handoff plus evidence only. No production/test/requirements/approval/specialist edit, build, provider, release, merge, push or Task completion.'}
r['pass']=not(missing or changed or retbad or unexpected or whitespace.returncode or aggregate.returncode) and aggregate.stdout.strip()==expected and historyprefix
(E/'final-audit.json').write_text(json.dumps(r,indent=2)+'\n')
print(json.dumps({k:r[k] for k in ['pass','incomingCount','protectedCount','retainedCandidateCount','referenceCount','unexpectedTrackedChanges']},indent=2))
if not r['pass']: raise SystemExit(1)
