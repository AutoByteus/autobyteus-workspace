from pathlib import Path
import json,subprocess as sp,time,shlex,hashlib
E=Path(__file__).resolve().parent
exec((E/'run-linux-docker-public.py').read_text().split('try:\n case(')[0].replace('linux-docker-public-result.json','native-peer-confirm-result.json'))
assert json.loads((E/'drained-detach-confirm-result.json').read_text())['result']=='Pass'
mac=json.loads((E/'mac-peer-resource.json').read_text());assert mac['result']=='Ready'
SRC='/home/admin/'+V+'-native-source';B='/home/admin/'+V+'-native-binary';build=json.loads((E/'build-result.json').read_text());r.update(source=SRC,binary=build['binary'],metadata=build['metadata'],peerResult='Not Tested')
def m(code,t=30,check=True):
 e={'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','HOME':'/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK/driver-home','TART_HOME':mac['tartHome'],'TART_NO_AUTO_PRUNE':'1'}
 a=[tart,'exec',mac['clone'],'/usr/bin/sudo','-n','-u','admin','/usr/bin/env','-i','HOME=/Users/admin','PATH=/usr/bin:/bin:/usr/sbin:/sbin','LANG=C','/bin/sh','-c',code]
 p=sp.run(a,env=e,capture_output=True,text=True,timeout=t);q={'argv':a,'rc':p.returncode,'stdout':p.stdout,'stderr':p.stderr};r['commands'].append(q);save()
 if check:assert p.returncode==0,q
 return q
try:
 prior=json.loads((E/'native-peer-result.json').read_text());assert prior['cases'][1]['status']=='Pass' and prior['cases'][3]['status']=='Pass';r['sourceIdentityBefore']=prior['sourceIdentityBefore'];r['connection']=prior['connection'];ip=prior['endpoint'];r['endpoint']=ip;r['createEvidence']='native-peer-result.json, no repeat create/reconnect';save()
 q=case('native package private mode managed job and installed binary identity',lambda:g('set -e; sha256sum /usr/libexec/autobyteus-nfs/autobyteus-nfs; dpkg-query -W -f="\${Package} \${Version} \${Architecture}\\n" nfs-ganesha nfs-ganesha-vfs; sudo -n stat -c "%a:%u:%g:%n" /var/lib/autobyteus-nfs /var/lib/autobyteus-nfs/attachment.json; systemctl is-active autobyteus-nfs.service autobyteus-nfs-ganesha.service; findmnt -n -o OPTIONS '+ROOT));assert build['binary']['sha256'] in q['stdout'] and q['stdout'].count('4.3-8ubuntu1+autobyteus1 arm64')==2 and '700:0:0:' in q['stdout'] and '600:0:0:' in q['stdout'] and 'vers=4.1' in q['stdout']
 r['nativeResult']='Pass';save();event('Native current public no-node create/reconnect regression Pass; source identity/no preinstalled engine/defaultY retained')
 tcp=m('/usr/bin/nc -G 3 -z '+ip+' 2049',t=8,check=False);r['peerTcp']=tcp;save()
 if tcp['rc']!=0:
  r['peerDiagnostics']=m('/sbin/route -n get '+ip+'; /usr/sbin/arp -an; /sbin/ping -c 2 -W 1000 '+ip,t=10,check=False);r['peerResult']='Blocked';r['peerBlocker']='Ordinary shared-NAT Mac-to-Linux TCP2049 unreachable; no host bridge/router/firewall/ARP workaround authorized. No mount attempted on known unhealthy path.';event(r['peerBlocker'])
 else:
  q=case('public Mac native connect to current Linux native source',lambda:m(mac['binary']['guestPath']+' connect --connection '+shlex.quote(json.dumps(r['connection']))+' --nodes none --yes --json',t=120));v=json.loads(q['stdout']);assert v['status']['hostReady'];r['macConnection']=q;save()
  q=case('Mac mounted original bytes UUID and ordinary peer write',lambda:m('set -e; test "$(cat '+ROOT+'/project/preexisting.txt)" = ORIGINAL_API004; cat '+ROOT+'/.autobyteus-nfs/storage.json; printf API004_MAC_NATIVE_PEER > '+ROOT+'/project/mac-peer.txt; sync'));assert r['connection']['storageId'] in q['stdout']
  q=case('Linux original source observes independent Mac write',lambda:nongroups('cat '+SRC+'/project/mac-peer.txt'));assert q['stdout']=='API004_MAC_NATIVE_PEER';r['peerResult']='Pass';save()
 r['result']='Pass native / '+r['peerResult']+' peer';save()
except BaseException as x:
 r['result']='Fail';r['fatal']=repr(x);save();event('Native/peer regression Fail/incomplete '+repr(x))
 try:r['diagnostics']=g('findmnt -t nfs,nfs4; sudo -n journalctl -b -u autobyteus-nfs.service -u autobyteus-nfs-ganesha.service --no-pager -n 80',check=False,timeout=20);save()
 except BaseException as y:r['diagnosticError']=repr(y);save()
print(json.dumps({k:r.get(k) for k in ['result','nativeResult','peerResult','fatal']}),flush=True)
