from pathlib import Path
import json,subprocess as sp
E=Path(__file__).resolve().parent;mac=json.loads((E/'mac-peer-resource.json').read_text());tart='/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK/tools/tart.app/Contents/MacOS/tart';assert mac['clone']=='ab-nfs-api005-mac-59bba374';env={'PATH':'/usr/bin:/bin','HOME':'/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK/driver-home','TART_HOME':mac['tartHome'],'TART_NO_AUTO_PRUNE':'1'};r={'ownedVM':mac['clone'],'pid':mac['vmPid'],'commands':[],'result':'Running','publicDetach':json.loads((E/'mac-detach-result.json').read_text())['result']}
def save():(E/'mac-cleanup.json').write_text(json.dumps(r,indent=2)+'\n')
q=sp.run(['/bin/ps','-p',str(mac['vmPid']),'-o','command='],capture_output=True,text=True);assert tart+' run '+mac['clone'] in q.stdout
for a in [[tart,'stop',mac['clone'],'--timeout','15'],[tart,'delete',mac['clone']],[tart,'list']]:
 p=sp.run(a,env=env,capture_output=True,text=True,timeout=90);r['commands'].append({'argv':a,'rc':p.returncode,'stdout':p.stdout,'stderr':p.stderr});save();assert p.returncode==0
r['processAbsent']=sp.run(['/bin/ps','-p',str(mac['vmPid'])],capture_output=True).returncode!=0;r['cloneAbsent']=not (Path(mac['tartHome'])/'vms'/mac['clone']).exists();r['publicCacheRetained']=Path('/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK').exists();assert r['processAbsent'] and r['cloneAbsent'] and r['publicCacheRetained'];r['result']='Complete';save()
