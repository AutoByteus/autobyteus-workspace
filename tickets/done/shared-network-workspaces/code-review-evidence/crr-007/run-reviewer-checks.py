"""CRR007 personal read-only delta audit and nonpublishing checks, no product edits."""
from pathlib import Path
import hashlib, json, subprocess as sp, tempfile, time
R=Path(__file__).resolve().parents[5]
E=Path(__file__).resolve().parent
T=R/'tickets/in-progress/shared-network-workspaces'
B='b1747fbdc3fe41f8aa8413f7e110a42ce9687704'
H='0d244f40496b368cbe1613f75d6cd21bb444c58d'
C='eb7934072a1f98832b7b6330a1bc6a7f348fd93d'
assert (R/'.github/workflows/release-nfs.yml').is_file()
def write(name,value): (E/name).write_text(json.dumps(value,indent=2)+'\n')
def git(*args):return sp.check_output(['git',*args],cwd=R)
def sha(data):return hashlib.sha256(data).hexdigest()
assert git('rev-parse','HEAD').decode().strip()==H
changes=git('diff','--name-only',B,H).decode().splitlines()
source=[p for p in changes if not p.startswith('tickets/')]
assert source==['.github/workflows/release-nfs.yml','scripts/tests/test_nfs_release_workflow.py'],source
incoming=json.loads((T/'implementation-evidence/ir-006/source-audit.json').read_text())
unchanged=[]
for row in incoming['unchanged']:
    path=row['path'];now=(R/path).read_bytes();old=git('show',B+':'+path)
    assert now==old and sha(now)==row['sha256'],path
    unchanged.append({'path':path,'sha256':sha(now)})
delta=[]
for path in source:
    now=(R/path).read_bytes();assert now==git('show',C+':'+path)
    old=sp.run(['git','show',B+':'+path],cwd=R,capture_output=True).stdout
    delta.append({'path':path,'sha256':sha(now),'beforeNonempty':sum(bool(s.strip()) for s in old.splitlines()),'currentNonempty':sum(bool(s.strip()) for s in now.splitlines()),'thresholdsApply':path.endswith('.yml')})
refs=json.loads((T/'implementation-evidence/ir-006/package-index.json').read_text())['reference_files']
assert all(Path(p).is_file() for p in refs)
retained=json.loads((T/'implementation-evidence/ir-005/retained-candidate.json').read_text())['files']
for f in retained:
    data=Path(f['path']).read_bytes();assert len(data)==f['size'] and sha(data)==f['sha256']
old_history=git('show',B+':tickets/in-progress/shared-network-workspaces/implementation-revision-record.md')
assert (T/'implementation-revision-record.md').read_bytes().startswith(old_history)
write('delta-audit.json',{'review':'CRR007','scope':'Targeted Delta Review','head':H,'sourceCommit':C,'baseline':B,'changedSource':delta,'unchangedCount':len(unchanged),'unchanged':unchanged,'incomingReferencesExist':len(refs),'retainedCandidateHashes':retained,'implementationHistoryPrefixPreserved':True,'oldCandidateAggregateNotCurrent':True})
results=[]
with tempfile.TemporaryDirectory(prefix='ab-nfs-crr007-') as tmp:
    root=Path(tmp);(root/'home').mkdir();(root/'tmp').mkdir()
    env={'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','HOME':str(root/'home'),'TMPDIR':str(root/'tmp'),'PYTHONDONTWRITEBYTECODE':'1'}
    def run(name,args,expect=0):
        start=time.monotonic();q=sp.run(args,cwd=R,env=env,capture_output=True,text=True,timeout=90)
        (E/(name+'.log')).write_text(q.stdout+q.stderr)
        results.append({'name':name,'argv':args,'cwd':str(R),'environment':env,'rc':q.returncode,'expected':expect,'seconds':round(time.monotonic()-start,3)})
        write('checks-result.json',results)
        assert q.returncode==expect,(name,q.stdout,q.stderr)
        return q
    run('actionlint-version',['/opt/homebrew/bin/actionlint','-version'])
    run('actionlint',['/opt/homebrew/bin/actionlint','-shellcheck=','-pyflakes=','.github/workflows/release-nfs.yml'])
    run('python-packaging',['/usr/bin/python3','-B','-m','unittest','scripts/tests/test_nfs_release_workflow.py','scripts/tests/test_nfs_engine_packaging.py','scripts/tests/test_nfs_installer_fixture.py','scripts/tests/test_nfs_packaging_and_launcher.py','-v'])
    run('publish-refusal',['/usr/bin/python3','-B','autobyteus-nfs/packaging/release.py','--check-publish'],1)
    h=run('source-hash',['/usr/bin/python3','-B','autobyteus-nfs/packaging/release.py','--source-hash']).stdout.strip()
    hc=run('candidate-input-source-hash',['/usr/bin/python3','-B','autobyteus-nfs/packaging/release.py','--source-hash','--engine-manifest',str(T/'implementation-evidence/ir-005/built-engine-manifest.json')]).stdout.strip()
    assert h=='4568593b99bb3dff263e9824ceb7176e04a95ec90e3cd14a9f7421b4e43055ac'
    assert hc=='5563645d23aaac13aaa26948490d68dfc12fef31775bb66156185f9052ab0acc'
    current=(R/source[0]).read_text()
    old=root/'before.yml';old.write_bytes(git('show',B+':'+source[0]))
    signing=root/'without-binary-result.yml'
    # Scratch-only control; deliberately remove one actual predicate from publish.
    marker=current.index('\n  publish:\n')
    signing.write_text(current[:marker]+current[marker:].replace(" && needs.binaries.result == 'success'",'',1))
    for name,path in [('old-workflow-control',old),('missing-binary-result-control',signing)]:
        code="import pathlib,unittest;from scripts.tests import test_nfs_release_workflow as t;t.WORKFLOW=pathlib.Path("+repr(str(path))+");r=unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(t.ReleaseWorkflowGatesTest));raise SystemExit(not r.wasSuccessful())"
        q=run(name,['/usr/bin/python3','-B','-c',code],1)
        assert 'AssertionError' in q.stderr and 'ERROR' not in q.stderr
    run('source-whitespace',['git','diff','--check',B,H,'--',*source])
    scratch=str(root)
write('cleanup.json',{'ownedScratch':scratch,'removed':not Path(scratch).exists(),'allSubprocessesCompleted':True,'VMContainerMountHostRootProviderCredentialsHostedWorkflowOrReleaseUsed':False,'delegations':0,'productionAndDurableTestEdits':False,'retainedCandidateUnchanged':True})
print(json.dumps({'commands':len(results),'allExpected':True,'unchanged':len(unchanged),'incomingReferences':len(refs),'retainedArtifacts':len(retained),'scratchRemoved':not Path(scratch).exists()}))
