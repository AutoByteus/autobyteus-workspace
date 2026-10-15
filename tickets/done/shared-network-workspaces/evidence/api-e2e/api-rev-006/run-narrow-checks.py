from pathlib import Path
import subprocess as sp,os,json,time
R=Path.cwd();E=Path(__file__).resolve().parent;T=R/'tickets/in-progress/shared-network-workspaces';S=Path((E/'scratch-path.txt').read_text().strip());env={'PATH':os.environ['PATH'],'HOME':str(S/'home'),'TMPDIR':str(S/'tmp'),'GOTOOLCHAIN':'local','LANG':'en_US.UTF-8','LC_ALL':'en_US.UTF-8','CI':'1','PYTHONDONTWRITEBYTECODE':'1'};rows=[]
def event(msg):
 with (T/'api-e2e-test-case-ledger.md').open('a') as f:f.write('\n- '+time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())+' **Round6 N01** — '+msg+'\n')
for name,args,cwd in [('go-race',[str(S/'go/bin/go'),'test','-race','-count=1','-v','./...'],R/'autobyteus-nfs'),('go-vet',[str(S/'go/bin/go'),'vet','./...'],R/'autobyteus-nfs'),('python-bootstrap-launcher',['python3','-m','unittest','scripts/tests/test_nfs_packaging_and_launcher.py','scripts/tests/test_nfs_installer_fixture.py','scripts/tests/test_public_docker_launcher_shared_workspace.py','scripts/tests/test_nfs_engine_packaging.py','scripts/tests/test_nfs_release_workflow.py','-v'],R)]:
 event('Starting '+name);start=time.monotonic()
 with (E/(name+'.log')).open('w') as log:p=sp.run(args,cwd=cwd,env=env,stdout=log,stderr=sp.STDOUT)
 row={'name':name,'argv':args,'cwd':str(cwd),'rc':p.returncode,'seconds':round(time.monotonic()-start,3)};rows.append(row);(E/'narrow-checks-result.json').write_text(json.dumps(rows,indent=2)+'\n');event(name+': '+('Pass' if p.returncode==0 else 'Fail'));print(row,flush=True)
 if p.returncode:raise SystemExit(p.returncode)
