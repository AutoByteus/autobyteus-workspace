"""IR006 personal nonpublishing checks; no hosted jobs/credentials/root/resources."""
from pathlib import Path
import subprocess as sp
import os, json, tempfile, time, hashlib
R=Path.cwd();E=Path(__file__).resolve().parent
results=[]
with tempfile.TemporaryDirectory(prefix='ab-nfs-ir006-') as tmp:
    root=Path(tmp);(root/'home').mkdir();(root/'tmp').mkdir()
    env={'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','HOME':str(root/'home'),'TMPDIR':str(root/'tmp'),'PYTHONDONTWRITEBYTECODE':'1'}
    def run(name,args,expected=0):
        start=time.monotonic();q=sp.run(args,cwd=R,env=env,capture_output=True,text=True,timeout=90)
        (E/(name+'.log')).write_text(q.stdout+q.stderr)
        results.append({'name':name,'argv':args,'cwd':str(R),'environment':env,'rc':q.returncode,'expected':expected,'seconds':round(time.monotonic()-start,3)})
        (E/'checks-result.json').write_text(json.dumps(results,indent=2)+'\n')
        assert q.returncode==expected,(name,q.stdout,q.stderr)
        return q
    run('actionlint-version',['/opt/homebrew/bin/actionlint','-version'])
    run('actionlint',['/opt/homebrew/bin/actionlint','-shellcheck=','-pyflakes=','.github/workflows/release-nfs.yml'])
    run('python-packaging',['/usr/bin/python3','-B','-m','unittest','scripts/tests/test_nfs_release_workflow.py','scripts/tests/test_nfs_engine_packaging.py','scripts/tests/test_nfs_installer_fixture.py','scripts/tests/test_nfs_packaging_and_launcher.py','-v'])
    run('publish-refusal',['/usr/bin/python3','-B','autobyteus-nfs/packaging/release.py','--check-publish'],1)
    run('source-hash',['/usr/bin/python3','-B','autobyteus-nfs/packaging/release.py','--source-hash'])
    run('candidate-input-source-hash',['/usr/bin/python3','-B','autobyteus-nfs/packaging/release.py','--source-hash','--engine-manifest','tickets/in-progress/shared-network-workspaces/implementation-evidence/ir-005/built-engine-manifest.json'])
    current=(R/'.github/workflows/release-nfs.yml').read_text()
    baseline=sp.check_output(['git','show','28775788db8d1a3d1d54b86a29ebfac34e1a463b:.github/workflows/release-nfs.yml'],cwd=R,text=True)
    def replace_gate(text,job,change):
        import re
        start=text.index('\n  '+job+':\n');part=text[start:];m=re.search(r'^    if: (.+)$',part,re.M);assert m
        a=start+m.start(1);b=start+m.end(1)
        return text[:a]+change(text[a:b])+text[b:]
    mutants={
      'baseline-status-gating':baseline,
      'mutation-unconditional-engine':replace_gate(current,'engine',lambda x:'${{ always() }}'),
      'mutation-ignore-binary-signing-result':replace_gate(current,'publish',lambda x:x.replace(" && needs.binaries.result == 'success'",'')),
      'mutation-ignore-cancellation':current.replace('!cancelled()','always()'),
      'mutation-publish-on-build-only':replace_gate(current,'publish',lambda x:x.replace(" && needs.prepare.outputs.publish == 'true'",'')),
      'mutation-accept-failed-rebuild':replace_gate(current,'engine-inputs',lambda x:"${{ !cancelled() && needs.prepare.result == 'success' && (needs.engine-packages.result == 'success' || needs.prepare.outputs.publish == 'true') }}"),
    }
    for name,text in mutants.items():
        f=root/(name+'.yml');f.write_text(text)
        script="import pathlib,unittest; from scripts.tests import test_nfs_release_workflow as t; t.WORKFLOW=pathlib.Path("+repr(str(f))+"); r=unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(t.ReleaseWorkflowGatesTest)); raise SystemExit(not r.wasSuccessful())"
        q=run(name,['/usr/bin/python3','-B','-c',script],1)
        assert 'AssertionError' in q.stderr and 'ERROR' not in q.stderr,(name,q.stderr)
    run('whitespace',['git','diff','--check'])
    scratch=str(root)
(E/'cleanup.json').write_text(json.dumps({'ownedScratch':scratch,'removed':not Path(scratch).exists(),'allSubprocessesCompleted':True,'noVMContainerMountAppNodeCredentialProviderHostedWorkflowOrRelease':True,'retainedIR005CandidateUntouched':True,'delegations':0},indent=2)+'\n')
print(json.dumps({'commands':len(results),'allExpected':True,'scratchRemoved':not Path(scratch).exists()}))
