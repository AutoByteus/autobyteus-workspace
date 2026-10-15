"""Personal unit/race/vet/cross-build + mutation checks only; no privileged resources."""
from pathlib import Path
import subprocess as sp,json,time,shutil,sys,hashlib,os
sys.dont_write_bytecode=True
R=Path.cwd();E=Path(__file__).resolve().parent;S=Path((E/'scratch-path.txt').read_text().strip());rows=[]
for p in [S,S/'home',S/'tmp']:os.chown(p,-1,os.getgid())
env={'PATH':str(S/'go/bin')+':/usr/bin:/bin:/usr/sbin:/sbin','HOME':str(S/'home'),'TMPDIR':str(S/'tmp'),'GOTOOLCHAIN':'local','PYTHONDONTWRITEBYTECODE':'1'}
def run(name,args,cwd=R,extra=None,expected=0):
 start=time.monotonic();p=sp.run([str(a) for a in args],cwd=cwd,env=env|(extra or {}),capture_output=True,text=True,timeout=300)
 (E/(name+'.log')).write_text(p.stdout+p.stderr);rows.append({'name':name,'argv':[str(a) for a in args],'cwd':str(cwd),'rc':p.returncode,'expected':expected,'seconds':round(time.monotonic()-start,3)})
 (E/'checks-result.json').write_text(json.dumps(rows,indent=2)+'\n');assert p.returncode==expected,(name,p.stdout[-2500:],p.stderr[-2500:]);return p.stdout
run('go-race',[S/'go/bin/go','test','-race','-count=1','-v','./...'],R/'autobyteus-nfs')
run('go-vet',[S/'go/bin/go','vet','./...'],R/'autobyteus-nfs')
run('python-packaging',['python3','-m','unittest','scripts/tests/test_nfs_engine_packaging.py','scripts/tests/test_nfs_installer_fixture.py','scripts/tests/test_nfs_packaging_and_launcher.py','scripts/tests/test_nfs_release_workflow.py','-v'])
run('shell-syntax',['bash','-n','scripts/public/docker/autobyteus-docker.d/bash/commands.sh'])
run('publish-refusal',['python3','autobyteus-nfs/packaging/release.py','--check-publish'],expected=1)
run('source-hash',['python3','autobyteus-nfs/packaging/release.py','--source-hash'])
for system in ['darwin','linux']:
 for arch in ['arm64','amd64']:
  run('build-'+system+'-'+arch,[S/'go/bin/go','build','-trimpath','-o',S/('nfs-'+system+'-'+arch),'./cmd/autobyteus-nfs'],R/'autobyteus-nfs',{'GOOS':system,'GOARCH':arch,'CGO_ENABLED':'0'})
run('native-version',[S/'nfs-darwin-arm64','version'])

# Compile all OS-specific test packages, not just the CLI, on both other arches/OSes.
for system,arch in [('darwin','amd64'),('linux','arm64'),('linux','amd64')]:
 dest=S/('test-binaries-final-'+system+'-'+arch);dest.mkdir()
 run('test-compile-'+system+'-'+arch,[S/'go/bin/go','test','-c','-o',str(dest)+'/', './...'],R/'autobyteus-nfs',{'GOOS':system,'GOARCH':arch,'CGO_ENABLED':'0'})
print('Personal race/vet/packaging/build checks complete')
