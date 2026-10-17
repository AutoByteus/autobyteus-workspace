"""Personal source-review checks; isolated environment, no actual daemon/mount/provider."""
from pathlib import Path
import subprocess as sp,json,time,shutil,os
R=Path.cwd();E=Path(__file__).resolve().parent;S=Path((E/'scratch-path.txt').read_text().strip());rows=[]
assert (E/'toolchain.json').is_file()
env={'PATH':str(S/'go/bin')+':/usr/bin:/bin:/usr/sbin:/sbin','HOME':str(S/'home'),'TMPDIR':str(S/'tmp'),'GOTOOLCHAIN':'local','PYTHONDONTWRITEBYTECODE':'1'}
def run(name,args,cwd=R,expected=0):
 t=time.monotonic();p=sp.run([str(a) for a in args],cwd=cwd,env=env,capture_output=True,text=True,timeout=300)
 (E/(name+'.log')).write_text(p.stdout+p.stderr);rows.append({'name':name,'argv':[str(a) for a in args],'cwd':str(cwd),'rc':p.returncode,'expected':expected,'seconds':round(time.monotonic()-t,3)})
 (E/'checks-result.json').write_text(json.dumps(rows,indent=2)+'\n');assert p.returncode==expected,(name,p.stdout[-1200:],p.stderr[-1200:]);print(name,'expected exit',expected,flush=True);return p.stdout
run('go-version',[S/'go/bin/go','version'])
run('go-race',[S/'go/bin/go','test','-race','-count=1','-json','./...'],R/'autobyteus-nfs')
run('go-vet',[S/'go/bin/go','vet','./...'],R/'autobyteus-nfs')
run('python-packaging',['python3','-m','unittest','scripts/tests/test_nfs_engine_packaging.py','scripts/tests/test_nfs_installer_fixture.py','scripts/tests/test_nfs_packaging_and_launcher.py','scripts/tests/test_nfs_release_workflow.py','-v'])
run('source-hash',['python3','autobyteus-nfs/packaging/release.py','--source-hash'])
run('publish-refusal',['python3','autobyteus-nfs/packaging/release.py','--check-publish'],expected=1)
mutations=[('omit-export-expiry','backend/ganesha.go',' Attr_Expiration_Time = 0;\n','','TestGaneshaPolicyAndPersistentRecovery','backend'),('missing-ready','setup/status.go','backend.VerifyGanesha(','backend.VerifyGaneshaForDetach(','TestHostedConfigStatusRefusesBeforeReadiness','setup'),('skip-detach','setup/lifecycle.go','if err = backend.VerifyGaneshaForDetach(*h, s.Store.Directory, h.Backend == "ganesha-docker"); err != nil {','if err = error(nil); err != nil {','TestHostedConfigDetachPreflightsBeforeEffects','setup')]
for name,file,old,new,test,pkg in mutations:
 d=S/('mutation-'+name);shutil.copytree(R/'autobyteus-nfs',d,ignore=shutil.ignore_patterns('out','__pycache__'))
 p=d/'internal'/file;s=p.read_text();assert old in s;p.write_text(s.replace(old,new))
 out=run('mutation-'+name,[S/'go/bin/go','test','-count=1','-run',test,'./internal/'+pkg],d,expected=1)
 assert '--- FAIL:' in out and '[build failed]' not in out
print('Completed',flush=True)
