"""Retire only exact API003-owned VM/tag/scratch after all evidence is saved."""
from pathlib import Path
import subprocess as sp,json,shutil,time,hashlib
R=Path.cwd();E=Path(__file__).resolve().parent;S=Path((E/'scratch-path.txt').read_text().strip());c=json.loads((E/'linux-final-resource.json').read_text());tart='/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK/tools/tart.app/Contents/MacOS/tart';env={'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','HOME':str(S/'home'),'TART_HOME':c['privateTartHome'],'TART_NO_AUTO_PRUNE':'1'};r={'result':'Running','commands':[],'scratch':str(S),'priorVMs':json.loads((E/'initial-vms-cleanup.json').read_text())}
def save():(E/'cleanup.json').write_text(json.dumps(r,indent=2)+'\n')
def cmd(a,env=None,check=True,timeout=60):
 p=sp.run(a,env=env,capture_output=True,text=True,timeout=timeout);q={'argv':a,'rc':p.returncode,'stdout':p.stdout,'stderr':p.stderr};r['commands'].append(q);save()
 if check and p.returncode:raise RuntimeError(q)
 return q
def absent(pid):return sp.run(['/bin/ps','-p',str(pid),'-o','command='],capture_output=True).returncode!=0
try:
 assert json.loads((E/'managed-detach-confirm-result.json').read_text())['result'].startswith('Pass')
 r['desktop']=json.loads((E/'desktop-validation-result.json').read_text());assert r['desktop']['stop']['rc']==0 and r['desktop']['tunnelCleanup']['absent'];assert absent(65865) and absent(57800)
 assert S.name=='ab-nfs-api003-cc7rp5vo' and c['clone']=='ab-nfs-api003-linux-b7497a85';pid=26890;q=cmd(['/bin/ps','-p',str(pid),'-o','command=']);assert tart+' run '+c['clone'] in q['stdout']
 cmd([tart,'stop',c['clone'],'--timeout','15'],env=env);cmd([tart,'delete',c['clone']],env=env);r['vm']={'name':c['clone'],'pid':pid,'processAbsent':absent(pid),'cloneAbsent':not (Path(c['privateTartHome'])/'vms'/c['clone']).exists()};assert r['vm']['processAbsent'] and r['vm']['cloneAbsent'];save()
 tag='ab-nfs-api003-server:current';q=cmd(['/usr/local/bin/docker','image','inspect',tag,'--format','{{.Id}}']);assert q['stdout'].strip()=='sha256:dd986b8ae47f0947516d1b708df200161d28a33706eb177b59b1afa70be937b4';cmd(['/usr/local/bin/docker','image','rm',tag],timeout=120);q=cmd(['/usr/local/bin/docker','image','inspect',tag],check=False);r['ownedHostImageTagAbsent']=q['rc']!=0;assert r['ownedHostImageTagAbsent'];q=cmd(['/usr/local/bin/docker','inspect','ab-nfs-api003-image-audit'],check=False);r['ownedAuditContainerAbsent']=q['rc']!=0;assert r['ownedAuditContainerAbsent']
 retained=json.loads((E.parents[2]/'implementation-evidence/ir-005/retained-candidate.json').read_text());r['retainedCandidate']=[{'path':x['path'],'unchanged':Path(x['path']).exists() and hashlib.sha256(Path(x['path']).read_bytes()).hexdigest()==x['sha256']} for x in retained['files']];assert all(x['unchanged'] for x in r['retainedCandidate']);r['publicMacCacheRetained']=Path('/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK').exists();assert r['publicMacCacheRetained']
 r['preexistingGeneratedDirs']={p:(R/p).exists() for p in ['applications/brief-studio/dist','autobyteus-application-backend-sdk/dist','autobyteus-application-devkit/dist','autobyteus-application-frontend-sdk/dist','autobyteus-application-sdk-contracts/dist']};assert all(r['preexistingGeneratedDirs'].values());save()
 shutil.rmtree(S);r['scratchAbsent']=not S.exists();assert r['scratchAbsent'];r['retained']='Public Mac image/tool cache, exact11 IR005 candidate files, preexisting generated outputs, ordinary Docker build cache/shared layers (no global prune). Current-worktree ignored build outputs not staged.';r['guestDisposal']='Own selected/unselected containers, registry, engine, named/private volumes, sshkey authorization, mounts/services and synthetic sources removed with owned VM. Public detach proven before retirement; no user data/network/node changed.';r['result']='Complete';save()
except BaseException as x:r['result']='Incomplete';r['error']=repr(x);save();raise
print(json.dumps({'result':r['result'],'vm':r.get('vm'),'scratchAbsent':r.get('scratchAbsent')}),flush=True)
