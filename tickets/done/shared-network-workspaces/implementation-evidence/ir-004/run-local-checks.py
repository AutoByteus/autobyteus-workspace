"""IR004 personal local checks; no privileged OS/mount/provider operations.
Run from the assigned worktree. Toolchain root is test-owned; mutation copies
are created beneath it and never replace current production source.
"""
import pathlib,json,subprocess as sp,time,shutil,hashlib,os
R=pathlib.Path.cwd();E=pathlib.Path(__file__).resolve().parent
root=pathlib.Path(json.loads((E/'toolchain.json').read_text())['root'])
assert root.name.startswith('ab-nfs-ir004-')
ENV={'PATH':str(root/'go/bin')+':/usr/bin:/bin:/usr/sbin:/sbin','HOME':str(root/'home'),'TMPDIR':str(root),'GOTOOLCHAIN':'local'}
GO=str(root/'go/bin/go');results=[]
def run(name,argv,cwd,expected=0,extra=None):
 start=time.monotonic();env=dict(ENV);env.update(extra or {})
 with (E/(name+'.log')).open('w') as f:p=sp.run(argv,cwd=cwd,env=env,stdout=f,stderr=sp.STDOUT)
 row={'name':name,'argv':argv,'cwd':str(cwd),'expected':expected,'rc':p.returncode,'seconds':round(time.monotonic()-start,3),'environment':env};results.append(row)
 (E/'local-checks-result.json').write_text(json.dumps(results,indent=2)+'\n');print(name,p.returncode,flush=True)
 assert (p.returncode==0) if expected==0 else (p.returncode!=0),row
run('go-race',[GO,'test','-race','-count=1','-v','./...'],R/'autobyteus-nfs')
run('go-vet',[GO,'vet','./...'],R/'autobyteus-nfs')
run('python-packaging',['/usr/bin/python3','-m','unittest','scripts/tests/test_nfs_installer_fixture.py','scripts/tests/test_nfs_packaging_and_launcher.py','-v'],R)
for target in ['darwin-arm64','darwin-amd64','linux-arm64','linux-amd64']:
 goos,arch=target.split('-');run('build-'+target,[GO,'build','-trimpath','-o',str(root/('nfs-'+target)),'./cmd/autobyteus-nfs'],R/'autobyteus-nfs',extra={'CGO_ENABLED':'0','GOOS':goos,'GOARCH':arch})
run('native-version',[str(root/'nfs-darwin-arm64'),'version'],R)
run('unqualified-publish',['/usr/bin/python3','autobyteus-nfs/packaging/release.py','--check-publish'],R,expected=1)
for name,filename,old,new,test in [
 ('mutation-activation-only','apple_apply.go','return waitAppleRPC(r, endpoint)','return nil','TestAppleActivationWaitsForBothServingPrograms'),
 ('mutation-one-observation','apple_startup.go','pause(250 * time.Millisecond)','return err','TestAppleColdRPCStartupRechecksNFSAndMountWithoutReactivation'),
 ('mutation-blanket-retry','apple_startup.go','if !starting {','_ = starting\n\t\tif false {','TestAppleStartupDoesNotMaskInvalidSetupOrExecution'),
]:
 dst=root/name;shutil.copytree(R/'autobyteus-nfs',dst)
 try:
  path=dst/'internal/backend'/filename;source=path.read_text();assert old in source;path.write_text(source.replace(old,new))
  run(name,[GO,'test','-count=1','-run','^'+test+'$','./internal/backend'],dst,expected=1)
 finally:shutil.rmtree(dst)
print('Complete',flush=True)
