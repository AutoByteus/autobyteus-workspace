"""Public create/reconnect regression, no manual engine installation or reader bypass.
Only test-owned disposable Ubuntu guest; retain until subsequent owned lifecycle checks.
"""
from pathlib import Path
import json,subprocess as sp,time,shlex,hashlib
R=Path.cwd();E=Path(__file__).resolve().parent;T=E.parent.parent.parent;S=Path((E/'scratch-path.txt').read_text().strip());cfg=json.loads((E/'linux-resource.json').read_text());build=json.loads((E/'build-docker-result.json').read_text());V=cfg['clone'];B='/home/admin/'+V+'-binary';SRC='/home/admin/'+V+'-docker-source';ROOT='/Volumes/autobyteus-shared';tart='/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK/tools/tart.app/Contents/MacOS/tart';env={'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','HOME':str(S/'home'),'TART_HOME':cfg['privateTartHome'],'TART_NO_AUTO_PRUNE':'1'}
r={'vm':V,'source':SRC,'mountRoot':ROOT,'binary':build['binary'],'metadata':build['metadata'],'commands':[],'cases':[],'result':'Running'}
def save():(E/'linux-docker-public-result.json').write_text(json.dumps(r,indent=2)+'\n')
def event(s):
 with (T/'api-e2e-test-case-ledger.md').open('a') as f:f.write('\n- '+time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())+' **Round4 V03-Docker storage** — '+s+'\n')
 print(s,flush=True)
def cmd(a,timeout=60,data=None,check=True):
 start=time.monotonic()
 try:p=sp.run([tart,*a],env=env,input=data,capture_output=True,timeout=timeout);q={'argv':[tart,*a],'rc':p.returncode,'seconds':round(time.monotonic()-start,3),'stdout':p.stdout.decode(errors='replace'),'stderr':p.stderr.decode(errors='replace')}
 except sp.TimeoutExpired as x:q={'argv':[tart,*a],'timeout':timeout,'stdout':(x.stdout or b'').decode(errors='replace'),'stderr':(x.stderr or b'').decode(errors='replace')};r['commands'].append(q);save();raise
 r['commands'].append(q);save()
 if check and q['rc']:raise RuntimeError(q['stderr'][-6000:]+q['stdout'][-2000:])
 return q
def g(code,**kw):return cmd(['exec',V,'/usr/bin/env','-i','HOME=/home/admin','PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin','LANG=C','/bin/sh','-c',code],**kw)
def nongroups(code,**kw):return g('sudo -n /usr/bin/setpriv --reuid=1000 --regid=109 --clear-groups /usr/bin/env -i HOME=/home/admin PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin LANG=C /bin/sh -c '+shlex.quote(code),**kw)
def case(name,fn):
 event('Started '+name);start=time.monotonic();q={'name':name}
 try:q['evidence']=fn();q['status']='Pass'
 except BaseException as x:q['status']='Fail';q['error']=repr(x);raise
 finally:q['seconds']=round(time.monotonic()-start,3);r['cases'].append(q);save();event(name+': '+q['status'])
 return q['evidence']
def snapshot():
 code="""import os,json,hashlib,stat
from pathlib import Path
p=Path(SOURCE);s=p.stat()
def h(p):return hashlib.sha256(p.read_bytes()).hexdigest()
r={'sourceIdentity':[s.st_dev,s.st_ino,s.st_uid,s.st_gid,stat.S_IMODE(s.st_mode)],'sourceHash':h(p/'project/preexisting.txt'),'sourceMarker':json.loads((p/'.autobyteus-nfs/storage.json').read_text()),'mountedHash':h(Path(MOUNT)/'project/preexisting.txt'),'mountedMarker':json.loads((Path(MOUNT)/'.autobyteus-nfs/storage.json').read_text()),'directoryDelegations':Path('/sys/module/nfsv4/parameters/directory_delegations').read_text().strip(),'uid':os.getuid(),'gid':os.getgid(),'groups':os.getgroups()};print(json.dumps(r))
""".replace('SOURCE',repr(SRC)).replace('MOUNT',repr(ROOT))
 return nongroups('python3 -c '+shlex.quote(code))
try:
 case('distinct nonempty ext4 source after drained native detach',lambda:g('set -e; ! findmnt -n -t nfs,nfs4 '+ROOT+'; test ! -e /etc/autobyteus-nfs/attachment.json; ! systemctl is-active --quiet autobyteus-nfs-ganesha.service; mkdir -m 755 '+SRC+'; mkdir -m 755 '+SRC+'/project; printf ORIGINAL_API004 > '+SRC+'/project/preexisting.txt; id; stat -c "%d:%i:%u:%g:%a" '+SRC+'; sudo -n docker info --format "{{.OSType}} {{.ServerVersion}}"'))
 r['sourceIdentityBefore']=g('stat -c "%d:%i:%u:%g:%a" '+SRC)['stdout'].strip();addr=json.loads(g('ip -4 -j addr show scope global')['stdout']);ip=[x['local'] for n in addr for x in n['addr_info'] if x['family']=='inet'][0];r['endpoint']=ip
 data=Path(build['binary']['path']).read_bytes();assert hashlib.sha256(data).hexdigest()==build['binary']['sha256'];cmd(['exec','-i',V,'/bin/sh','-c','umask 077; cat > '+B+'; chmod 755 '+B],data=data)
 q=case('public Docker storage create from same immutable engine artifact',lambda:nongroups('umask 077; exec '+B+' create --source '+SRC+' --backend ganesha-docker --endpoint '+ip+' --allow '+ip+' --nodes none --yes --json',timeout=180));payload=json.loads(q['stdout']);assert payload['status']['hostReady'];r['connection']=payload['connection'];save()
 def proof():
  q=snapshot();v=json.loads(q['stdout']);assert v['sourceHash']==v['mountedHash']==hashlib.sha256(b'ORIGINAL_API004').hexdigest();assert v['sourceMarker']==v['mountedMarker']=={'storageId':payload['connection']['storageId']};assert v['uid']==1000 and v['gid']==109 and v['groups']==[] and v['directoryDelegations']=='Y';assert ':'.join(map(str,v['sourceIdentity'][:4]))+':'+oct(v['sourceIdentity'][4])[2:]==r['sourceIdentityBefore'];return q
 case('Docker-backed mounted same source identity UUID bytes nonroot/defaultY',proof)
 q=case('public Docker storage reconnect',lambda:nongroups(B+' reconnect --yes --json',timeout=60));status=json.loads(q['stdout']);assert status['hostReady'] and status['storageId']==r['connection']['storageId']
 r['engineInspect']=g('sudo -n docker ps --filter label=com.autobyteus.nfs.storageId='+r['connection']['storageId']+' --format "{{.ID}} {{.Names}}"; sudo -n cat /var/lib/autobyteus-nfs/hosted-filesystem.json; sudo -n systemctl is-active autobyteus-nfs.service; sha256sum /usr/libexec/autobyteus-nfs/autobyteus-nfs');assert build['binary']['sha256'] in r['engineInspect']['stdout'];r['result']='Pass';save();event('Docker-on-Linux storage create/reconnect native self-client Pass; managedDocker client not yet executed')
except BaseException as x:
 r['result']='Fail';r['fatal']=repr(x);save();event('Fail/incomplete '+repr(x))
 try:r['diagnostics']=g('findmnt -t nfs,nfs4; sudo -n docker ps -a; sudo -n cat /var/lib/autobyteus-nfs/hosted-filesystem.json; sudo -n cat /var/lib/autobyteus-nfs/ganesha/ganesha.conf; sudo -n journalctl -u autobyteus-nfs.service --no-pager -n 40; cat /sys/module/nfsv4/parameters/directory_delegations',check=False,timeout=20);save()
 except BaseException as y:r['diagnosticError']=repr(y);save()
print(json.dumps({'result':r['result'],'fatal':r.get('fatal')}),flush=True)
