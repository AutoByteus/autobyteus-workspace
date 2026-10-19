from pathlib import Path
import json,subprocess as sp,time,shutil
E=Path(__file__).resolve().parent;S=Path((E/'scratch-path.txt').read_text().strip());C=Path('/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK');t=str(C/'tools/tart.app/Contents/MacOS/tart');r={'commands':[],'linux':[],'mac':[],'scratch':str(S)}
def save():(E/'cleanup.json').write_text(json.dumps(r,indent=2)+'\n')
def c(a,env):
 p=sp.run(a,env=env,capture_output=True,text=True,timeout=45);row={'argv':a,'rc':p.returncode,'stdout':p.stdout,'stderr':p.stderr};r['commands'].append(row);save();return row
assert S.name=='ab-nfs-api002-5861wgnv' and S.is_dir()
env={'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','HOME':str(S/'home'),'TART_HOME':str(S/'linux-tart-state'),'TART_NO_AUTO_PRUNE':'1'}
for n in ['linux-start.json','linux-repro-start.json']:
 cfg=json.loads((E/n).read_text());vm=cfg['vm'];pid=cfg['vmPid'];assert vm.startswith('ab-nfs-api002-linux-')
 before=c(['/bin/ps','-p',str(pid),'-o','pid=,command='],env);assert before['rc']==0 and 'tart run '+vm+' ' in before['stdout']
 q=c([t,'stop',vm,'--timeout','15'],env);assert q['rc']==0
 for _ in range(30):
  p=sp.run(['/bin/ps','-p',str(pid),'-o','command='],capture_output=True,text=True)
  if p.returncode:break
  time.sleep(1)
 assert p.returncode!=0,(pid,p.stdout)
 q=c([t,'delete',vm],env);assert q['rc']==0
 r['linux'].append({'vm':vm,'pid':pid,'processAbsent':True,'cloneAbsent':not (S/'linux-tart-state/vms'/vm).exists()});assert r['linux'][-1]['cloneAbsent'];save()
q=c([t,'list','--format','json'],env);assert q['rc']==0
macenv={'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','HOME':str(C/'driver-home'),'TART_HOME':str(C/'tart-state'),'TART_NO_AUTO_PRUNE':'1'}
q=c([t,'list','--format','json'],macenv);assert q['rc']==0
for vm in ['ab-nfs-api002-37446d5f','ab-nfs-api002-04979de5','ab-nfs-api002-ebe8a71b-server','ab-nfs-api002-ebe8a71b-client']:
 assert vm not in q['stdout'];r['mac'].append({'vm':vm,'absent':True})
r['publicMacCacheRetained']=C.exists();assert r['publicMacCacheRetained']
q=c(['/bin/ps','-Ao','pid=,command='],env)
owned=[line for line in q['stdout'].splitlines() if 'tart run ab-nfs-api002-' in line and not 'ps -Ao' in line]
r['ownedVMProcessesRemaining']=owned;assert not owned
# Do not retain unrelated host command lines. This observation is only the owned match list.
r['commands'][-1]['stdout']='Filtered for own VM prefix only: '+json.dumps(owned)+'\n'
shutil.rmtree(S);r['scratchAbsent']=not S.exists();assert r['scratchAbsent'];r['result']='Complete';r['time']=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime());save()
with (E.parent.parent.parent/'api-e2e-test-case-ledger.md').open('a') as f:f.write('\n- '+r['time']+' **Round2 cleanup completed** — all six owned VM clones/processes absent; own toolchain/candidate/Linux-cache/scratch deleted; public Mac cache retained. cleanup.json.\n')
print(json.dumps({k:r[k] for k in ['result','linux','mac','scratchAbsent','publicMacCacheRetained']}),flush=True)
