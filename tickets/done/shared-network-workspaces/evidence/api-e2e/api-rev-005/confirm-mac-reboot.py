"""Fresh owned Mac native no-node create, ordinary reboot/reconnect/drained detach."""
from pathlib import Path
import json,subprocess as sp,time,hashlib,shlex
E=Path(__file__).resolve().parent;T=E.parent.parent.parent;mac=json.loads((E/'mac-peer-resource.json').read_text());assert mac['result']=='Ready'
tart='/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK/tools/tart.app/Contents/MacOS/tart';env={'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','HOME':'/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK/driver-home','TART_HOME':mac['tartHome'],'TART_NO_AUTO_PRUNE':'1'}
B=mac['binary']['guestPath'];ROOT='/Volumes/autobyteus-shared';SRC='/Users/admin/'+mac['clone']+'-source';r={'vm':mac['clone'],'source':SRC,'binary':mac['binary'],'commands':[],'cases':[],'result':'Running'}
def save():(E/'mac-reboot-confirm-result.json').write_text(json.dumps(r,indent=2)+'\n')
def event(s):
 print(s,flush=True)
 with (T/'api-e2e-test-case-ledger.md').open('a') as f:f.write('\n- '+time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())+' **Round5 V01 Mac-native** — '+s+'\n')
def m(code,t=60,check=True):
 a=[tart,'exec',mac['clone'],'/usr/bin/sudo','-n','-u','admin','/usr/bin/env','-i','HOME=/Users/admin','PATH=/usr/bin:/bin:/usr/sbin:/sbin','LANG=C','/bin/sh','-c',code];start=time.monotonic()
 try:
  p=sp.run(a,env=env,capture_output=True,text=True,timeout=t);q={'argv':a,'rc':p.returncode,'seconds':round(time.monotonic()-start,3),'stdout':p.stdout,'stderr':p.stderr}
 except sp.TimeoutExpired as x:q={'argv':a,'timeout':t};r['commands'].append(q);save();raise
 r['commands'].append(q);save()
 if check:assert p.returncode==0,q
 return q
def case(name,fn):
 event('Started '+name);c={'name':name};start=time.monotonic()
 try:c['evidence']=fn();c['status']='Pass'
 except BaseException as x:c['status']='Fail';c['error']=repr(x);raise
 finally:c['seconds']=round(time.monotonic()-start,3);r['cases'].append(c);save();event(name+': '+c['status'])
 return c['evidence']
def proof():
 q=m('set -e; stat -f "%d:%i:%u:%g:%Lp" '+SRC+'; test "$(cat '+SRC+'/project/preexisting.txt)" = ORIGINAL_API005_MAC; test "$(cat '+ROOT+'/project/preexisting.txt)" = ORIGINAL_API005_MAC; cmp '+SRC+'/.autobyteus-nfs/storage.json '+ROOT+'/.autobyteus-nfs/storage.json; cat '+SRC+'/.autobyteus-nfs/storage.json; sudo -n stat -f "%Lp:%u:%g:%N" /Library/"Application Support"/AutoByteusNFS /Library/"Application Support"/AutoByteusNFS/attachment.json; shasum -a 256 /Library/AutoByteusNFS/libexec/autobyteus-nfs; sudo -n launchctl print system/com.autobyteus.nfs')
 assert r['sourceIdentity'] in q['stdout'] and r['connection']['storageId'] in q['stdout'] and mac['binary']['sha256'] in q['stdout'] and 'state = running' in q['stdout'];assert '\n700:0:' in q['stdout'] and '\n600:0:' in q['stdout'];return q
prior=json.loads((E/'mac-native-result.json').read_text());assert prior['result']=='Fail';r.update(connection=prior['connection'],originalSourceIdentity=prior['sourceIdentity'],observations=[],scope='Second ordinary reboot, no config/source/engine edits; readonly identity/status observation before any explicit diagnostic reconnect')
def observe():
 q=m('/usr/sbin/sysctl -n kern.boottime; /sbin/mount; /usr/bin/stat -f "%d:%i:%u:%g:%Lp:%N" '+SRC+' '+SRC+'/project/preexisting.txt; shasum -a 256 '+SRC+'/project/preexisting.txt '+SRC+'/.autobyteus-nfs/storage.json; cat '+SRC+'/.autobyteus-nfs/storage.json; sudo -n cat /Library/"Application Support"/AutoByteusNFS/hosted-filesystem.json; sudo -n shasum -a 256 /Library/"Application Support"/AutoByteusNFS/hosted-filesystem.json; /usr/sbin/diskutil info -plist '+SRC+'; sudo -n /sbin/nfsd status; sudo -n tail -60 /Library/"Application Support"/AutoByteusNFS/service.log',check=False,t=25)
 r['observations'].append(q);save();return q
try:
 observe();old=m('/usr/sbin/sysctl -n kern.boottime')['stdout'];r['beforeSecondBoot']=old;save()
 try:m('sudo -n shutdown -r now',t=10,check=False)
 except sp.TimeoutExpired:pass
 end=time.monotonic()+210
 while time.monotonic()<end:
  try:
   q=m('/usr/sbin/sysctl -n kern.boottime',t=5,check=False)
   if q['rc']==0 and q['stdout']!=old:r['afterSecondBoot']=q['stdout'];save();break
  except sp.TimeoutExpired:pass
  time.sleep(3)
 else:raise RuntimeError('second boot not observed')
 for n in range(3):
  time.sleep(35);observe();q=m(B+' status --yes --json',check=False,t=20);r.setdefault('statusObservations',[]).append(q);save()
 r['diagnosticReconnect']=m(B+' reconnect --yes --json',check=False,t=60);observe();r['result']='Observed';save();event('Mac source-identity second ordinary boot observation complete; actual status/identity governs classification, no identity bypass')
except BaseException as x:r['result']='Incomplete';r['fatal']=repr(x);save();event('Mac identity observation incomplete '+repr(x))
