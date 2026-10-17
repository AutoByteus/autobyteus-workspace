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

mutations=[
 ('omit-export-expiry','backend/ganesha.go',' Attr_Expiration_Time = 0;\n','','TestGaneshaPolicyAndPersistentRecovery','backend'),
 ('client-only-expiry','backend/ganesha.go',' Attr_Expiration_Time = 0;\n','','TestGaneshaPolicyAndPersistentRecovery','backend'),
 ('skip-status-preflight','setup/status.go','if h != nil &&','if false && h != nil &&','TestHostedConfigStatusRefusesBeforeReadiness','setup'),
 ('allow-missing-readiness','setup/status.go','backend.VerifyGanesha(','backend.VerifyGaneshaForDetach(','TestHostedConfigStatusRefusesBeforeReadiness','setup'),
 ('skip-detach-preflight','setup/lifecycle.go','if err = backend.VerifyGaneshaForDetach(*h, s.Store.Directory, h.Backend == "ganesha-docker"); err != nil {','if err = error(nil); err != nil {','TestHostedConfigDetachPreflightsBeforeEffects','setup'),
 ('reject-partial-detach','backend/ganesha_native.go','os.IsNotExist(err) {\n\t\treturn nil','os.IsNotExist(err) {\n\t\treturn os.ErrNotExist','TestHostedConfigDetachCurrentOrPartialRetryReachesExistingChecks','setup'),
 ('accept-different-config','backend/ganesha_native.go','if string(actual) != expected {','if false && string(actual) != expected {','TestGaneshaConfigPreflightAndExactRemoval','backend'),
]
for name,file,old,new,test,pkg in mutations:
 dest=S/('mutation-'+name);shutil.copytree(R/'autobyteus-nfs',dest,ignore=shutil.ignore_patterns('out','__pycache__'))
 p=dest/'internal'/file;s=p.read_text();assert old in s,(name,old);s=s.replace(old,new)
 if name=='client-only-expiry':s=s.replace(' CLIENT {',' CLIENT {\n  Attr_Expiration_Time = 0;')
 p.write_text(s)
 run('mutation-'+name,[S/'go/bin/go','test','-count=1','-run',test,'./internal/'+pkg],dest,expected=1)
 log=(E/('mutation-'+name+'.log')).read_text();assert '--- FAIL:' in log and 'build failed' not in log,name
print('All local checks and seven intended failing mutation controls completed')
