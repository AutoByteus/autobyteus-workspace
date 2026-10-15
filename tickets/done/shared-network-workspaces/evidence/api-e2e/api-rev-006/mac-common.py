from pathlib import Path
import json,subprocess as sp,time,hashlib,shlex,plistlib,os
E=Path(__file__).resolve().parent;T=E.parent.parent.parent;mac=json.loads((E/'mac-peer-resource.json').read_text());assert mac['result']=='Ready'
tart='/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK/tools/tart.app/Contents/MacOS/tart';env={'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','HOME':'/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK/driver-home','TART_HOME':mac['tartHome'],'TART_NO_AUTO_PRUNE':'1'}
B=mac['binary']['guestPath'];ROOT='/Volumes/autobyteus-shared';SRC='/Users/admin/'+mac['clone']+'-source';STATE='/Library/Application Support/AutoByteusNFS';Q=shlex.quote
r={'vm':mac['clone'],'source':SRC,'binary':mac['binary'],'commands':[],'cases':[],'result':'Running'}
OUT='mac-native-result.json'
def save():(E/OUT).write_text(json.dumps(r,indent=2)+'\n')
def event(s):
 print(s,flush=True)
 with (T/'api-e2e-test-case-ledger.md').open('a') as f:f.write('\n- '+time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())+' **Round6 V01** — '+s+'\n')
def m(code,t=60,check=True,data=None):
 a=[tart,'exec',*(['-i'] if data is not None else []),mac['clone'],'/usr/bin/sudo','-n','-u','admin','/usr/bin/env','-i','HOME=/Users/admin','PATH=/usr/bin:/bin:/usr/sbin:/sbin','LANG=C','/bin/sh','-c',code];start=time.monotonic()
 try:
  p=sp.run(a,env=env,input=data,capture_output=True,timeout=t);q={'argv':a,'rc':p.returncode,'seconds':round(time.monotonic()-start,3),'stdout':p.stdout.decode(errors='replace'),'stderr':p.stderr.decode(errors='replace')}
 except sp.TimeoutExpired as x:q={'argv':a,'timeout':t};r['commands'].append(q);save();raise
 r['commands'].append(q);save()
 if check:assert q['rc']==0,q
 return q

def case(name,fn):
 event('Started '+name);c={'name':name};start=time.monotonic()
 try:c['evidence']=fn();c['status']='Pass'
 except BaseException as x:c['status']='Fail';c['error']=repr(x);raise
 finally:c['seconds']=round(time.monotonic()-start,3);r['cases'].append(c);save();event(name+': '+c['status'])
 return c['evidence']
def capture(label):
 q=m('set -e; /usr/sbin/sysctl -n kern.bootsessionuuid; /usr/sbin/sysctl -n kern.boottime; /usr/bin/stat -f "%d:%i:%u:%g:%Lp" '+Q(SRC)+'; /bin/df '+Q(SRC));lines=q['stdout'].splitlines();device=lines[-1].split()[0]
 assert device.startswith('/dev/disk'),device
 volume=plistlib.loads(m('/usr/sbin/diskutil info -plist '+Q(device))['stdout'].encode())
 bound=m('sudo -n cat '+Q(STATE+'/hosted-filesystem.json'))['stdout'];mark=m('cat '+Q(SRC+'/.autobyteus-nfs/storage.json'))['stdout']
 hashes=m('shasum -a 256 '+Q(SRC+'/project/preexisting.txt')+' '+Q(SRC+'/.autobyteus-nfs/storage.json'))['stdout']
 v={'label':label,'bootID':lines[0],'bootTime':lines[1],'stat':lines[2],'volume':{k:volume.get(k) for k in ['DeviceNode','MountPoint','FilesystemType','VolumeUUID']},'bindingBytes':bound,'bindingSHA256':hashlib.sha256(bound.encode()).hexdigest(),'markerBytes':mark,'hashes':hashes};r.setdefault('observations',[]).append(v);save();return v

def mounted_proof(label):
 token='RW_API006_'+label
 q=m('set -e; test "$(id -u)" = 501; test "$(cat '+Q(ROOT+'/project/preexisting.txt')+')" = ORIGINAL_API006_MAC; cmp '+Q(SRC+'/.autobyteus-nfs/storage.json')+' '+Q(ROOT+'/.autobyteus-nfs/storage.json')+'; printf %s '+Q(token)+' > '+Q(ROOT+'/project/'+label+'.txt')+'; sync; test "$(cat '+Q(SRC+'/project/'+label+'.txt')+')" = '+Q(token)+'; /sbin/mount; sudo -n stat -f "%Lp:%u:%g:%N" '+Q(STATE)+' '+Q(STATE+'/attachment.json')+'; shasum -a 256 /Library/AutoByteusNFS/libexec/autobyteus-nfs; sudo -n launchctl print system/com.autobyteus.nfs; sudo -n cat /etc/exports; sudo -n cat /etc/nfs.conf; sudo -n cat /Library/LaunchDaemons/com.autobyteus.nfs.plist')
 assert mac['binary']['sha256'] in q['stdout'] and 'state = running' in q['stdout'];assert '700:0:' in q['stdout'] and '600:0:' in q['stdout'];assert ' on '+ROOT+' (nfs' in q['stdout'];return q

def boot(label):
 old=m('/usr/sbin/sysctl -n kern.bootsessionuuid')['stdout'].strip();r.setdefault('boots',[]).append({'label':label,'before':old});b=r['boots'][-1];save();start=time.monotonic()
 try:m('sudo -n shutdown -r now',t=10,check=False)
 except sp.TimeoutExpired:pass
 end=time.monotonic()+240
 while time.monotonic()<end:
  try:
   q=m('/usr/sbin/sysctl -n kern.bootsessionuuid',t=5,check=False)
   if q['rc']==0 and q['stdout'].strip()!=old:
    b['after']=q['stdout'].strip();save()
    q=m('/sbin/mount | grep '+Q(' on '+ROOT+' (nfs')+' >/dev/null && test "$(cat '+Q(ROOT+'/project/preexisting.txt')+')" = ORIGINAL_API006_MAC',t=8,check=False)
    if q['rc']==0:break
  except sp.TimeoutExpired:pass
  time.sleep(3)
 else:raise RuntimeError('automatic mount not observed after ordinary boot; no manual reconnect performed (observation window, not SLA)')
 b['observedSeconds']=round(time.monotonic()-start,3);save();mounted_proof(label);v=capture(label);base=r['baseline'];assert v['bootID']!=base['bootID'];assert v['bindingBytes']==base['bindingBytes'];assert v['stat'].split(':')[1:]==base['stat'].split(':')[1:];assert v['volume']['VolumeUUID']==base['volume']['VolumeUUID'];assert v['hashes']==base['hashes'];assert v['markerBytes']==base['markerBytes'];return v
