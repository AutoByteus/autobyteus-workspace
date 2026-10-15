"""Only exact API005 owned VM, current local tag, process and scratch disposal."""
from pathlib import Path
import subprocess as sp,json,shutil,time,hashlib
R=Path.cwd();E=Path(__file__).resolve().parent;S=Path((E/'scratch-path.txt').read_text().strip());c=json.loads((E/'linux-resource.json').read_text());st=json.loads((E/'linux-start.json').read_text());tart='/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK/tools/tart.app/Contents/MacOS/tart';env={'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','HOME':str(S/'home'),'TART_HOME':c['privateTartHome'],'TART_NO_AUTO_PRUNE':'1'};r={'result':'Running','commands':[],'scratch':str(S)}
def save():(E/'cleanup.json').write_text(json.dumps(r,indent=2)+'\n')
def cmd(a,env=None,check=True,timeout=60):
 p=sp.run(a,env=env,capture_output=True,text=True,timeout=timeout);q={'argv':a,'rc':p.returncode,'stdout':p.stdout,'stderr':p.stderr};r['commands'].append(q);save()
 if check and p.returncode:raise RuntimeError(q)
 return q
def absent(pid):return sp.run(['/bin/ps','-p',str(pid),'-o','command='],capture_output=True).returncode!=0
try:
 assert json.loads((E/'docker-detach-result.json').read_text())['result']=='Pass'
 r['mac']=json.loads((E/'mac-cleanup.json').read_text());assert r['mac']['result']=='Complete' and absent(r['mac']['pid'])
 d=json.loads((E/'desktop-cleanup.json').read_text());assert d['result']=='Stopped';instance=json.loads((E/'desktop-start-result.json').read_text())['response']['result'];t=json.loads((E/'guest-loopback-tunnel-result.json').read_text());assert absent(instance['pid']) and absent(t['pid']);r['desktopStopped']=True;r['tunnelAbsent']=True
 assert S.name=='ab-nfs-api005-s1d2nqng' and c['clone']=='ab-nfs-api005-linux-618f79bb';pid=st['vmPid'];q=cmd(['/bin/ps','-p',str(pid),'-o','command=']);assert tart+' run '+c['clone'] in q['stdout']
 cmd([tart,'stop',c['clone'],'--timeout','15'],env=env);cmd([tart,'delete',c['clone']],env=env);r['vm']={'name':c['clone'],'pid':pid,'processAbsent':absent(pid),'cloneAbsent':not (Path(c['privateTartHome'])/'vms'/c['clone']).exists()};assert r['vm']['processAbsent'] and r['vm']['cloneAbsent'];save()
 image=json.loads((E/'server-build-v2-result.json').read_text());tag=image['tag'];assert tag=='ab-nfs-api005-server:current';q=cmd(['/usr/local/bin/docker','image','inspect',tag,'--format','{{.Id}}']);assert q['stdout'].strip()==image['image'][0]['Id'];cmd(['/usr/local/bin/docker','image','rm',tag],timeout=120);q=cmd(['/usr/local/bin/docker','image','inspect',tag],check=False);r['ownedHostImageTagAbsent']=q['rc']!=0;assert r['ownedHostImageTagAbsent']
 retained=json.loads((E/'input-audit.json').read_text())['retainedFiles'];r['retainedCandidates']=[{'path':x['path'],'unchanged':Path(x['path']).exists() and hashlib.sha256(Path(x['path']).read_bytes()).hexdigest()==x['sha256'] and Path(x['path']).stat().st_size==x['size']} for x in retained];assert all(x['unchanged'] for x in r['retainedCandidates']);r['publicMacCacheRetained']=Path('/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK').exists();assert r['publicMacCacheRetained']
 r['preexistingGeneratedDirs']={p:(R/p).exists() for p in ['applications/brief-studio/dist','autobyteus-application-backend-sdk/dist','autobyteus-application-devkit/dist','autobyteus-application-frontend-sdk/dist','autobyteus-application-sdk-contracts/dist']};assert all(r['preexistingGeneratedDirs'].values());save()
 shutil.rmtree(S);r['scratchAbsent']=not S.exists();assert r['scratchAbsent'];cache=E/'__pycache__'
 if cache.exists():shutil.rmtree(cache)
 r['retained']='Public Mac image/tool cache,19 retained IR005/007/008 candidate files, prior generated dirs/current ignored build outputs, ordinary Docker build cache/shared layers; no global prune. Dist hash changes classified separately.';r['guestDisposal']='Own test nodes, registry, engine, named/private volumes, SSH key, services, synthetic sources disposed with exact owned VMs after public detach proof. No user resources or network/profile mutation.';r['result']='Complete';save()
except BaseException as x:r['result']='Incomplete';r['error']=repr(x);save();raise
print(json.dumps({'result':r['result'],'vm':r.get('vm'),'scratchAbsent':r.get('scratchAbsent')}),flush=True)
