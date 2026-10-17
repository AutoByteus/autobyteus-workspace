"""User narrowed to one Linux VM/two nodes. Stop pending orchestration and retire unused Mac."""
from pathlib import Path
import json,subprocess as sp,os,signal,time
E=Path(__file__).resolve().parent;g=json.loads((E/'guests.json').read_text());r={'reason':'User accepts one VM with two Docker nodes; cross-OS setup superseded','commands':[],'result':'Running'}
def save():(E/'scope-change-cleanup.json').write_text(json.dumps(r,indent=2)+'\n')
def cmd(a,env=None,t=60):
 p=sp.run(a,env=env,capture_output=True,text=True,timeout=t);q={'argv':a,'rc':p.returncode,'stdout':p.stdout,'stderr':p.stderr};r['commands'].append(q);save();return q
save()
# Stop only the identified orchestration process so it cannot start a second guest.
pid=78314;q=cmd(['ps','-p',str(pid),'-o','command=']);
if q['rc']==0:
 assert 'Python' in q['stdout'] and q['stdout'].strip().endswith('evidence/api-e2e/api-rev-007/prepare-guests.py'),q
 os.kill(pid,signal.SIGTERM);r['orchestratorStopped']=pid;save()
# Stop its exact ongoing clone child; retain any partial public image download for a later owned resume.
pid=79951;q=cmd(['ps','-p',str(pid),'-o','command='])
if q['rc']==0:
 assert 'tart clone ' in q['stdout'] and g['guests']['linux']['name'] in q['stdout'],q
 os.kill(pid,signal.SIGTERM);r['cloneDownloadStopped']=pid;save()
mac=g['guests']['mac'];q=cmd(['ps','-p',str(mac['pid']),'-o','command='])
if q['rc']==0:
 assert 'tart run '+mac['name'] in q['stdout'],q
 # No NFS setup ran in this guest. Verify before retirement.
 q=cmd([mac['tart'],'exec',mac['name'],'/bin/sh','-c','sudo -n test ! -e "/Library/Application Support/AutoByteusNFS/attachment.json"; test ! -e /etc/autobyteus-nfs/attachment.json; mount | grep autobyteus-shared || true'],mac['env']);assert q['rc']==0
 q=cmd([mac['tart'],'stop',mac['name']],mac['env']);assert q['rc']==0
 q=cmd([mac['tart'],'delete',mac['name']],mac['env']);assert q['rc']==0
q=cmd(['ps','-p',str(mac['pid']),'-o','command=']);assert q['rc']!=0
r['macGuestDeleted']=mac['name'];r['linuxGuestWasNotStarted']=not g['guests']['linux'].get('pid')
# No credentials, product configuration or mounts created. Keep test artifacts/build image for resumed tests.
r['retained']={'scratch':(E/'scratch-path.txt').read_text().strip(),'serverImage':json.loads((E/'server-build-v2-result.json').read_text())['image'][0]['Id'],'serverTag':'ab-nfs-api007-server:current','publicMacCache':'/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK','purpose':'Linux-only resumption; no running VM or test service retained'}
r['result']='Cross-OS setup stopped; Mac removed; reusable owned build/download retained';save();print(json.dumps({k:v for k,v in r.items() if k!='commands'}))
