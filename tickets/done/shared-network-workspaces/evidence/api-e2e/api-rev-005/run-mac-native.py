"""Fresh owned Mac native no-node create, ordinary reboot/reconnect/drained detach."""
from pathlib import Path
import json,subprocess as sp,time,hashlib,shlex
E=Path(__file__).resolve().parent;T=E.parent.parent.parent;mac=json.loads((E/'mac-peer-resource.json').read_text());assert mac['result']=='Ready'
tart='/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK/tools/tart.app/Contents/MacOS/tart';env={'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','HOME':'/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK/driver-home','TART_HOME':mac['tartHome'],'TART_NO_AUTO_PRUNE':'1'}
B=mac['binary']['guestPath'];ROOT='/Volumes/autobyteus-shared';SRC='/Users/admin/'+mac['clone']+'-source';r={'vm':mac['clone'],'source':SRC,'binary':mac['binary'],'commands':[],'cases':[],'result':'Running'}
def save():(E/'mac-native-result.json').write_text(json.dumps(r,indent=2)+'\n')
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
try:
 q=case('fresh nonempty owned APFS source',lambda:m('set -e; test ! -e /etc/autobyteus-nfs/attachment.json; mkdir -m 755 '+SRC+'; mkdir -m 755 '+SRC+'/project; printf ORIGINAL_API005_MAC > '+SRC+'/project/preexisting.txt; stat -f "%d:%i:%u:%g:%Lp" '+SRC));r['sourceIdentity']=q['stdout'].strip();save()
 q=case('one public nativeMac create under077 no selected nodes',lambda:m('umask 077; exec '+B+' create --source '+SRC+' --backend apple --endpoint '+mac['ip']+' --allow '+mac['ip']+' --nodes none --yes --json',t=180));v=json.loads(q['stdout']);assert v['status']['hostReady'] and v['status']['nodes']=={};r['connection']=v['connection'];save();case('Mac original/mounted identity bytes UUID private modes installed binary running job',proof)
 old=m('/usr/sbin/sysctl -n kern.boottime')['stdout'];r['beforeBoot']=old;save()
 try:m('sudo -n shutdown -r now',t=10,check=False)
 except sp.TimeoutExpired:pass
 end=time.monotonic()+210
 while time.monotonic()<end:
  try:
   q=m('/usr/sbin/sysctl -n kern.boottime',t=5,check=False)
   if q['rc']==0 and q['stdout']!=old:
    status=m(B+' status --yes --json',t=15,check=False)
    if status['rc']==0 and json.loads(status['stdout'])['hostReady']:r['afterBoot']=q['stdout'];r['automaticStatus']=status;save();break
  except sp.TimeoutExpired:pass
  time.sleep(3)
 else:raise RuntimeError('No automatic Mac host readiness after ordinary reboot in observation window; no reconnect performed')
 case('nativeMac ordinary reboot automatically preserves exact source and job',proof)
 q=case('explicit normal nativeMac reconnect',lambda:m(B+' reconnect --yes --json',t=90));assert json.loads(q['stdout'])['hostReady'];case('reconnect preserves nativeMac source',proof)
 case('nativeMac public drained detach',lambda:m(B+' detach --yes --drained --json',t=90))
 q=case('nativeMac detach source preservation and no owned attachment/job',lambda:m('set -e; test ! -e /etc/autobyteus-nfs/attachment.json; test ! -e /Library/LaunchDaemons/com.autobyteus.nfs.plist; ! mount | grep " on '+ROOT+' "; stat -f "%d:%i:%u:%g:%Lp" '+SRC+'; cat '+SRC+'/project/preexisting.txt; cat '+SRC+'/.autobyteus-nfs/storage.json'));assert r['sourceIdentity'] in q['stdout'] and 'ORIGINAL_API005_MAC' in q['stdout'] and r['connection']['storageId'] in q['stdout'];r['result']='Pass';save();event('Current nativeMac fresh create/ordinary reboot/reconnect/drained detach Pass; no independent peer/DockerDesktop/physical qualification')
except BaseException as x:
 r['result']='Fail';r['fatal']=repr(x);save();event('Mac native Fail/incomplete '+repr(x))
 try:r['diagnostics']=m('mount; sudo -n launchctl print system/com.autobyteus.nfs; sudo -n tail -60 /Library/"Application Support"/AutoByteusNFS/service.log',t=20,check=False);save()
 except BaseException as y:r['diagnosticError']=repr(y);save()
print(json.dumps({'result':r['result'],'fatal':r.get('fatal')}),flush=True)
