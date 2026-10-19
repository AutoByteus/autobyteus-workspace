"""CRR006 personal source/artifact and unprivileged packaging checks; no product edits.
No Go/VM/host installation, mount, container, workflow dispatch or publication.
"""
from pathlib import Path
import os,sys,json,hashlib,subprocess as sp,tempfile,time,tarfile,io,urllib.request
sys.dont_write_bytecode=True
R=Path(__file__).resolve().parents[5]; T=R/'tickets/in-progress/shared-network-workspaces'; E=Path(__file__).resolve().parent
assert R.joinpath('autobyteus-nfs').is_dir(),R
sha=lambda b:hashlib.sha256(b).hexdigest()
def save(name,d): (E/name).write_text(json.dumps(d,indent=2)+'\n')
def git(*a): return sp.check_output(['git',*a],cwd=R)
def count(b):return sum(bool(s.strip()) for s in b.decode().splitlines())
head=git('rev-parse','HEAD').decode().strip();basis='d1aceecc4888fe8b1d58be898337473cd4be8243'
a=json.loads((T/'implementation-evidence/ir-005/source-audit.json').read_text())
unchanged=[]
for row in a['unchangedReviewedAndAuthorityPaths']:
 p=row['path'];current=(R/p).read_bytes();prior=git('show',basis+':'+p)
 assert current==prior and sha(current)==row['sha256'],p
 unchanged.append({'path':p,'sha256':sha(current)})
paths=git('diff','--name-only',basis,'9992ffb30d4fbaab4852b87b2495738f1b5be908').decode().splitlines()
assert set(paths)=={r['path'] for r in a['delta']}
delta=[]
for row in a['delta']:
 p=row['path'];b=(R/p).read_bytes();assert sha(b)==row['sha256'],p
 before=sp.run(['git','show',basis+':'+p],cwd=R,capture_output=True).stdout
 delta.append({'path':p,'sha256':sha(b),'beforeNonempty':count(before),'afterNonempty':count(b),'deltaNonempty':count(b)-count(before),'implementationSource':row['implementationSource']})
refs=json.loads((T/'implementation-evidence/ir-005/package-index.json').read_text())['reference_files']
assert all(Path(p).is_file() for p in refs)
ret=json.loads((T/'implementation-evidence/ir-005/retained-candidate.json').read_text());retained=[]
for row in ret['files']:
 b=Path(row['path']).read_bytes();assert len(b)==row['size'] and sha(b)==row['sha256'];retained.append(row)
sys.path.insert(0,str(R/'autobyteus-nfs/packaging/engine'))
import manifest,source
candidate=Path(ret['root'])/'engine-candidate';m=json.loads((candidate/'engine-manifest.json').read_text());manifest.validate(m)
for arch,bundle in m['architectures'].items():manifest.verify_files(bundle,candidate/arch)
assert set(m['architectures'])=={'arm64'}
bundle=m['architectures']['arm64'];sourceFile=candidate/'arm64'/bundle['correspondingSource']['file']
with tarfile.open(sourceFile) as tar:
 members=tar.getnames();objects={n:tar.extractfile(n).read() for n in members}
 for name in ['README.md','build.py','source.py','manifest.py','source-lock.json','get-dir-delegation.patch']:
  assert objects['recipe/'+name]==(R/'autobyteus-nfs/packaging/engine'/name).read_bytes(),name
 assert sha(objects['nfs-ganesha_4.3.orig.tar.gz'])==source.LOCK['files'][1]['sha256']
 assert objects['COPYRIGHT']==(candidate/'arm64/COPYRIGHT').read_bytes()
 with tarfile.open(fileobj=io.BytesIO(objects['nfs-ganesha_4.3-8ubuntu1+autobyteus1.debian.tar.xz'])) as deb:
  names=deb.getnames();patchName=next(n for n in names if n.endswith('/autobyteus-get-dir-delegation.patch'))
  assert deb.extractfile(patchName).read()==objects['recipe/get-dir-delegation.patch']
  changelog=deb.extractfile(next(n for n in names if n.endswith('/changelog'))).read().decode()
  assert '4.3-8ubuntu1+autobyteus1' in changelog and '98eb77c4fd94effa6882b214698a77752ec79f6e' in changelog
save('source-audit.json',{'inputHead':head,'basis':basis,'scope':'Full Re-Audit: new release shape and build/install data-flow; all mandatory structural checks reevaluated','delta':delta,'unchangedCount':len(unchanged),'unchangedPaths':unchanged,'referencesExist':len(refs),'retainedCandidateFilesVerified':retained,'correspondingSourceMembers':members,'currentRecipeAndBackportInSource':True})
rows=[]
with tempfile.TemporaryDirectory(prefix='ab-nfs-crr006-check-') as tmp:
 s=Path(tmp);(s/'home').mkdir();(s/'tmp').mkdir()
 env={'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','HOME':str(s/'home'),'TMPDIR':str(s/'tmp'),'PYTHONDONTWRITEBYTECODE':'1'}
 for name,args,want in [
  ('python-packaging',['/usr/bin/python3','-B','-m','unittest','scripts/tests/test_nfs_engine_packaging.py','scripts/tests/test_nfs_installer_fixture.py','scripts/tests/test_nfs_packaging_and_launcher.py','-v'],0),
  ('source-hash',['/usr/bin/python3','-B','autobyteus-nfs/packaging/release.py','--source-hash'],0),
  ('publish-refusal',['/usr/bin/python3','-B','autobyteus-nfs/packaging/release.py','--check-publish'],1)]:
  now=time.monotonic();q=sp.run(args,cwd=R,env=env,capture_output=True,text=True,timeout=180)
  (E/(name+'.log')).write_text(q.stdout+q.stderr);rows.append({'name':name,'argv':args,'cwd':str(R),'rc':q.returncode,'expected':want,'seconds':round(time.monotonic()-now,3),'environment':env});save('checks-result.json',rows)
  assert q.returncode==want,(name,q.stdout,q.stderr)
 save('checks-result.json',{'commands':rows,'noGoRerun':True,'noVMOrRootOperations':True,'ownedTemporaryRoot':tmp,'cleanup':'TemporaryDirectory scope exits below'})
assert not Path(tmp).exists()
save('cleanup.json',{'ownedTemporaryRoot':tmp,'removed':True,'noPersistentProcessesVMsContainersOrServicesStarted':True,'testSubprocessesCompleted':True,'retainedIR005CandidateUntouched':True,'productionAndDurableTestsUnmodified':git('diff','--name-only','--',':(exclude)tickets').decode()==''})
print('Verified',len(unchanged),'unchanged paths,',len(delta),'delta files,',len(refs),'references,',len(retained),'retained candidate files; actual source archive inspected.')
print('Python packaging and deliberate unqualified refusal completed; no Go/VM/host operations.')
