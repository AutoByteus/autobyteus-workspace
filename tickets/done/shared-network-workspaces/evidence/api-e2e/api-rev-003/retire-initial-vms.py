from pathlib import Path
import json,subprocess as sp,time
E=Path(__file__).resolve().parent;S=Path((E/'scratch-path.txt').read_text().strip());t='/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK/tools/tart.app/Contents/MacOS/tart';env={'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','HOME':str(S/'home'),'TART_HOME':str(S/'linux-tart-state'),'TART_NO_AUTO_PRUNE':'1'};r=[]
for n in ['linux-start.json','linux-confirm-start.json']:
 j=json.loads((E/n).read_text());v=j['vm'];pid=j['vmPid'];assert v.startswith('ab-nfs-api003-linux-');p=sp.run(['/bin/ps','-p',str(pid),'-o','command='],capture_output=True,text=True);assert 'tart run '+v+' ' in p.stdout
 q={'vm':v,'pid':pid,'commands':[]}
 for args in [['stop',v,'--timeout','15'],['delete',v]]:
  p=sp.run([t,*args],env=env,capture_output=True,text=True,timeout=40);q['commands'].append({'argv':[t,*args],'rc':p.returncode,'stdout':p.stdout,'stderr':p.stderr});assert p.returncode==0
 p=sp.run(['/bin/ps','-p',str(pid),'-o','command='],capture_output=True,text=True);q['processAbsent']=p.returncode!=0;assert q['processAbsent'];q['cloneAbsent']=not (S/'linux-tart-state/vms'/v).exists();assert q['cloneAbsent'];r.append(q);(E/'initial-vms-cleanup.json').write_text(json.dumps(r,indent=2)+'\n')
print('Two initial VMs retired; final full-case VM retained for next checks')
