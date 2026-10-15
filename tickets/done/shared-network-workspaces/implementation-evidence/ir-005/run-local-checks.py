"""Personal implementation-scoped race/vet/build/fixture checks; no service setup."""
from pathlib import Path
import subprocess as sp,json,time,shutil,hashlib
R=Path.cwd();E=Path(__file__).resolve().parent;S=Path((E/'scratch-path.txt').read_text().strip())
env={'PATH':str(S/'go/bin')+':/usr/bin:/bin:/usr/sbin:/sbin','HOME':str(S/'go-home'),'TMPDIR':str(S/'go-tmp'),'GOTOOLCHAIN':'local'};rows=[]
def run(name,args,cwd=R,extra=None,expected=0):
 start=time.monotonic();q=sp.run(args,cwd=cwd,env=env| (extra or {}),capture_output=True,text=True,timeout=300)
 (E/(name+'.log')).write_text(q.stdout+q.stderr)
 rows.append({'name':name,'argv':[str(x) for x in args],'cwd':str(cwd),'environment':env|(extra or {}),'expected':expected,'rc':q.returncode,'seconds':round(time.monotonic()-start,3)})
 (E/'local-checks-result.json').write_text(json.dumps(rows,indent=2)+'\n');assert q.returncode==expected,(name,q.stdout[-2000:],q.stderr[-2000:])
run('go-race',[S/'go/bin/go','test','-race','-count=1','-v','./...'],R/'autobyteus-nfs')
run('go-vet',[S/'go/bin/go','vet','./...'],R/'autobyteus-nfs')
run('python-packaging',['/usr/bin/python3','-m','unittest','scripts/tests/test_nfs_engine_packaging.py','scripts/tests/test_nfs_installer_fixture.py','scripts/tests/test_nfs_packaging_and_launcher.py','-v'])
for os in ['darwin','linux']:
 for arch in ['arm64','amd64']:
  run('build-'+os+'-'+arch,[S/'go/bin/go','build','-trimpath','-o',S/('nfs-'+os+'-'+arch),'./cmd/autobyteus-nfs'],R/'autobyteus-nfs',{'GOOS':os,'GOARCH':arch,'CGO_ENABLED':'0'})
run('native-version',[S/'nfs-darwin-arm64','version'])
run('publish-refusal',['/usr/bin/python3','autobyteus-nfs/packaging/release.py','--check-publish'],expected=1)
for name in ['skip-digest','skip-requery','stock-install']:
 dest=S/('mutation-'+name);shutil.copytree(R/'autobyteus-nfs',dest,ignore=shutil.ignore_patterns('__pycache__'))
 if name=='skip-digest':
  p=dest/'internal/backend/engine_bundle.go';s=p.read_text();old='if fmt.Sprintf("%x", sha256.Sum256(b)) != p.SHA256 {';assert old in s;s=s.replace(old,'if false && fmt.Sprintf("%x", sha256.Sum256(b)) != p.SHA256 {')
  test='TestEngineBundleExactPairAndRefusals'
 elif name=='skip-requery':
  p=dest/'internal/backend/ubuntu_packages.go';s=p.read_text();old='if !installedVersion(r, name, versions[name]) {\n\t\t\treturn fmt.Errorf';assert old in s;s=s.replace(old,'if false && !installedVersion(r, name, versions[name]) {\n\t\t\treturn fmt.Errorf');test='TestUbuntuEmbeddedInstallAndFailureCleanup'
 else:
  p=dest/'internal/backend/ubuntu_packages.go';s=p.read_text();old='args = append(args, paths...)';assert old in s;s=s.replace(old,'_ = paths\n args = append(args,"nfs-ganesha=4.3-8ubuntu1","nfs-ganesha-vfs=4.3-8ubuntu1")');test='TestUbuntuEmbeddedInstallAndFailureCleanup'
 p.write_text(s);run('mutation-'+name,[S/'go/bin/go','test','-count=1','-run','^'+test+'$','./internal/backend'],dest,expected=1)
 log=(E/('mutation-'+name+'.log')).read_text();assert '--- FAIL:' in log and 'build failed' not in log
print('Final race/vet/packaging/4-target checks and three expected mutation failures completed')
