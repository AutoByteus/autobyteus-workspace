"""Personal nonprivileged reviewer checks; no real Docker, VM or mounts."""
from pathlib import Path
import subprocess as sp, tempfile, json, hashlib, shutil, urllib.request, tarfile, time, os
R=Path.cwd(); E=Path(__file__).resolve().parent
S=Path(tempfile.mkdtemp(prefix='nfs-crr009-')); (E/'scratch-path.txt').write_text(str(S)+'\n')
for p in ['home','tmp']: (S/p).mkdir()
rows=[]
def run(name,args,cwd=R,expected=0):
 start=time.monotonic(); p=sp.run([str(a) for a in args],cwd=cwd,env=env,capture_output=True,text=True,timeout=600)
 (E/(name+'.log')).write_text(p.stdout+p.stderr)
 rows.append(dict(name=name,argv=[str(a) for a in args],cwd=str(cwd),rc=p.returncode,expected=expected,seconds=round(time.monotonic()-start,3)))
 (E/'checks-result.json').write_text(json.dumps(rows,indent=2)+'\n')
 assert p.returncode==expected,(name,p.stdout[-1500:],p.stderr[-1500:])
 print(name,p.returncode,flush=True)
 return p.stdout+p.stderr
try:
 tc=json.loads((R/'tickets/in-progress/shared-network-workspaces/implementation-evidence/ir-007/toolchain.json').read_text())
 url='https://go.dev/dl/'+tc['filename']; archive=S/tc['filename']
 sp.run(['/usr/bin/curl','-4','--fail','--location','--connect-timeout','20','--max-time','180','--silent','--show-error','--output',str(archive),url],check=True,timeout=185)
 actual=hashlib.sha256(archive.read_bytes()).hexdigest(); assert actual==tc['sha256']
 (E/'toolchain.json').write_text(json.dumps(dict(url=url,sha256=actual,version=tc['version'],size=archive.stat().st_size),indent=2)+'\n')
 sp.run(['/usr/bin/tar','-xzf',str(archive),'-C',str(S)],check=True)
 env={'PATH':str(S/'go/bin')+':/usr/bin:/bin:/usr/sbin:/sbin','HOME':str(S/'home'),'TMPDIR':str(S/'tmp'),'GOTOOLCHAIN':'local','PYTHONDONTWRITEBYTECODE':'1'}
 go=S/'go/bin/go'
 run('go-version',[go,'version'])
 run('go-race',[go,'test','-race','-count=1','-v','./...'],R/'autobyteus-nfs')
 run('go-vet',[go,'vet','./...'],R/'autobyteus-nfs')
 run('python-packaging',['python3','-m','unittest','scripts/tests/test_nfs_engine_packaging.py','scripts/tests/test_nfs_installer_fixture.py','scripts/tests/test_nfs_packaging_and_launcher.py','scripts/tests/test_nfs_release_workflow.py','-v'])
 run('shell-syntax',['bash','-n','scripts/public/docker/autobyteus-docker.d/bash/commands.sh'])
 run('source-hash',['python3','autobyteus-nfs/packaging/release.py','--source-hash'])
 run('publish-refusal',['python3','autobyteus-nfs/packaging/release.py','--check-publish'],expected=1)
 # Re-run two controls on copies: the new authority must be both current-policy and write-ahead bounded.
 for name,file,old,new,test in [
  ('policy-no-control','start_observation.go','stringValue(p, "Name") == "unless-stopped"','stringValue(p, "Name") == "no" || stringValue(p, "Name") == "unless-stopped"','TestFailedStartRefusalsNeverProbeOrStart/policy_no'),
  ('write-ahead-control','start_recovery.go','if err = store.Write(attemptName(a.Node), attempt); err != nil {','if err = error(nil); err != nil {','TestFailedStartSameIDProofAndConsumption')]:
  dest=S/name; shutil.copytree(R/'autobyteus-nfs',dest,ignore=shutil.ignore_patterns('out','__pycache__'))
  f=dest/'internal/docker'/file; body=f.read_text(); assert old in body; f.write_text(body.replace(old,new))
  log=run(name,[go,'test','-count=1','-run',test,'./internal/docker'],dest,expected=1)
  assert '--- FAIL:' in log and 'build failed' not in log
finally:
 shutil.rmtree(S)
 (E/'cleanup.json').write_text(json.dumps({'scratch':str(S),'removed':not S.exists(),'realDaemonVMRootMountProviderResources':False,'sourceOrDurableTestEdits':False,'scope':'Reviewer-owned scratch/toolchain/home/caches/mutation copies only; preexisting dist and retained candidates untouched'},indent=2)+'\n')
