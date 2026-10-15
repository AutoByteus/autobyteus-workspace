from pathlib import Path
import json,subprocess as sp,time,shlex,hashlib
E=Path(__file__).resolve().parent
exec((E/'run-linux-docker-public.py').read_text().split('try:\n case(')[0].replace('linux-docker-public-result.json','native-peer-result.json'))
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
 case('native regression starts detached, no host Ganesha engine preinstallation',lambda:g('set -e; ! findmnt -n -t nfs,nfs4 '+ROOT+'; test ! -e /etc/autobyteus-nfs/attachment.json; ! dpkg-query -W -f="${Status}" nfs-ganesha 2>/dev/null | grep "install ok installed"; mkdir -m 755 '+SRC+'; mkdir -m 755 '+SRC+'/project; printf ORIGINAL_API004 > '+SRC+'/project/preexisting.txt; stat -c "%d:%i:%u:%g:%a" '+SRC))
 r['sourceIdentityBefore']=g('stat -c "%d:%i:%u:%g:%a" '+SRC)['stdout'].strip();ip=json.loads((E/'selected-create-result.json').read_text())['endpoint'];r['endpoint']=ip
 data=Path(build['binary']['path']).read_bytes();assert hashlib.sha256(data).hexdigest()==build['binary']['sha256'];cmd(['exec','-i',V,'/bin/sh','-c','umask 077; cat > '+B+'; chmod 755 '+B],data=data)
 q=case('public native storage create no selected nodes and exact Mac peer allowlist',lambda:nongroups('umask 077; exec '+B+' create --source '+SRC+' --backend ganesha-native --endpoint '+ip+' --allow '+ip+','+mac['ip']+' --nodes none --yes --json',timeout=240));v=json.loads(q['stdout']);r['connection']=v['connection'];assert v['status']['hostReady'] and v['status']['nodes']=={};save()
 def proof():
  q=snapshot();v=json.loads(q['stdout']);assert v['sourceHash']==v['mountedHash']==hashlib.sha256(b'ORIGINAL_API004').hexdigest();assert v['sourceMarker']==v['mountedMarker']=={'storageId':r['connection']['storageId']};assert v['uid']==1000 and v['gid']==109 and v['groups']==[] and v['directoryDelegations']=='Y';assert ':'.join(map(str,v['sourceIdentity'][:4]))+':'+oct(v['sourceIdentity'][4])[2:]==r['sourceIdentityBefore'];return q
 case('native original identity bytes UUID and real nonroot defaultY',proof)
 q=case('public native no-node reconnect through current owner',lambda:nongroups(B+' reconnect --yes --json',timeout=90));v=json.loads(q['stdout']);assert v['hostReady'] and v['nodes']=={}
 q=case('native package private mode managed job and installed binary identity',lambda:g('set -e; sha256sum /usr/libexec/autobyteus-nfs/autobyteus-nfs; dpkg-query -W -f="${Package} ${Version} ${Architecture}\\n" nfs-ganesha nfs-ganesha-vfs; sudo -n stat -c "%a:%u:%g:%n" /var/lib/autobyteus-nfs /var/lib/autobyteus-nfs/attachment.json; systemctl is-active autobyteus-nfs.service autobyteus-nfs-ganesha.service; findmnt -n -o OPTIONS '+ROOT));assert build['binary']['sha256'] in q['stdout'] and q['stdout'].count('4.3-8ubuntu1+autobyteus1 arm64')==2 and '700:0:0:' in q['stdout'] and '600:0:0:' in q['stdout'] and 'vers=4.1' in q['stdout']
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
