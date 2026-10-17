from pathlib import Path
import subprocess as sp,json,time
R=Path.cwd();E=Path(__file__).resolve().parent;T=R/'tickets/in-progress/shared-network-workspaces';S=Path((E/'scratch-path.txt').read_text().strip());cfg=json.loads((E/'linux-resource.json').read_text());C=Path('/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK');tart=str(C/'tools/tart.app/Contents/MacOS/tart');env={'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','HOME':str(S/'home'),'TART_HOME':cfg['privateTartHome'],'TART_NO_AUTO_PRUNE':'1'};r={'vm':cfg['clone'],'image':cfg['image'],'commands':[],'result':'Starting'}
def save():(E/'linux-start.json').write_text(json.dumps(r,indent=2)+'\n')
def cmd(a,t=30):
 try:
  p=sp.run([tart,*a],env=env,capture_output=True,text=True,timeout=t);row={'args':a,'rc':p.returncode,'stdout':p.stdout,'stderr':p.stderr}
 except sp.TimeoutExpired:row={'args':a,'timeout':t}
 r['commands'].append(row);save();return row
with (T/'api-e2e-test-case-ledger.md').open('a') as f:f.write('\n- '+time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())+' **Round6 V03 Started setup** — own Ubuntu24.04 public-image clone, private Tart root; no host bridge/root/credentials.\n')
cmd(['set',cfg['clone'],'--cpu','4','--memory','6144','--disk-size','60']);f=(E/'linux-boot.log').open('w');p=sp.Popen([tart,'run',cfg['clone'],'--no-graphics','--no-audio','--no-clipboard','--no-usb-accessories'],env=env,stdout=f,stderr=sp.STDOUT,start_new_session=True);r['vmPid']=p.pid;r['runArgv']=p.args;save()
for i in range(60):
 if p.poll() is not None:r['result']='Blocked';r['error']='VM exited';break
 q=cmd(['exec',cfg['clone'],'/bin/sh','-c','id; cat /etc/os-release; uname -a; findmnt -no SOURCE,FSTYPE /; ip -4 -j addr show scope global'],5)
 if q.get('rc')==0:r['result']='Ready';r['preflight']=q;break
 if 'macOS' in q.get('stderr','') and 'only' in q.get('stderr',''):r['result']='Needs SSH';break
 time.sleep(2)
else:r['result']='Needs SSH'
if r['result']!='Ready':r['ipObservation']=cmd(['ip',cfg['clone']],10)
save();print(json.dumps(r),flush=True)
# VM deliberately retained for same-owned V03 execution; PID/name recorded. Final round cleanup must retire it.
