"""Public create/reconnect regression, no manual engine installation or reader bypass.
Only test-owned disposable Ubuntu guest; retain until subsequent owned lifecycle checks.
"""
from pathlib import Path
import json,subprocess as sp,time,shlex,hashlib
R=Path.cwd();E=Path(__file__).resolve().parent;T=E.parent.parent.parent;S=Path((E/'scratch-path.txt').read_text().strip());cfg=json.loads((E/'linux-final-resource.json').read_text());build=json.loads((E/'build-docker-result.json').read_text());V=cfg['clone'];B='/home/admin/'+V+'-binary';SRC='/home/admin/'+V+'-docker-source';ROOT='/Volumes/autobyteus-shared';tart='/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK/tools/tart.app/Contents/MacOS/tart';env={'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','HOME':str(S/'home'),'TART_HOME':cfg['privateTartHome'],'TART_NO_AUTO_PRUNE':'1'}
r={'vm':V,'source':SRC,'mountRoot':ROOT,'binary':build['binary'],'metadata':build['metadata'],'commands':[],'cases':[],'result':'Running'}
def save():(E/'linux-docker-lifecycle-resume-result.json').write_text(json.dumps(r,indent=2)+'\n')
def event(s):
 with (T/'api-e2e-test-case-ledger.md').open('a') as f:f.write('\n- '+time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())+' **Round3 V03-Docker-life** — '+s+'\n')
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
prior=json.loads((E/'linux-docker-public-result.json').read_text());life=json.loads((E/'linux-docker-lifecycle-result.json').read_text());r['connection']=prior['connection'];r['sourceIdentityBefore']=prior['sourceIdentityBefore'];UUID=r['connection']['storageId'];boot=life['beforeReboot']['stdout'].splitlines()[0]
try:
 def postboot():
  q=g('cat /proc/sys/kernel/random/boot_id; findmnt -n -o FSTYPE '+ROOT);assert q['stdout'].splitlines()[0]!=boot and 'nfs4' in q['stdout']
  status=nongroups(B+' status --yes --json',timeout=60);v=json.loads(status['stdout']);assert v['hostReady'] and v['storageId']==UUID
  identity=snapshot();v=json.loads(identity['stdout']);assert v['sourceHash']==v['mountedHash']==hashlib.sha256(b'ORIGINAL_API003').hexdigest();assert v['sourceMarker']==v['mountedMarker']=={'storageId':UUID};assert v['directoryDelegations']=='Y';assert ':'.join(map(str,v['sourceIdentity'][:4]))+':'+oct(v['sourceIdentity'][4])[2:]==r['sourceIdentityBefore']
  after=g('sudo -n sha256sum /var/lib/autobyteus-nfs/attachment.json /var/lib/autobyteus-nfs/hosted-filesystem.json; dpkg-query -W nfs-common nfs-ganesha nfs-ganesha-vfs; cat '+SRC+'/project/relative.txt; cat '+ROOT+'/project/relative.txt; sudo -n systemctl is-active autobyteus-nfs.service; sudo -n docker ps --filter label=com.autobyteus.nfs.storageId=' +UUID+ ' --format "{{.ID}} {{.Image}}"');assert after['stdout'].startswith('\n'.join(life['beforeReboot']['stdout'].splitlines()[1:])+'\n');return {'bootMount':q,'status':status,'identity':identity,'after':after}
 case('post normal reboot same managed attachment without manual reconnect',postboot)
 case('public drained detach',lambda:nongroups(B+' detach --yes --drained --json',timeout=60))
 def detached():
  q=g('set -e; ! findmnt -n -t nfs,nfs4 '+ROOT+'; test ! -e /etc/autobyteus-nfs/attachment.json; test ! -e /etc/systemd/system/autobyteus-nfs.service; test ! -e /etc/systemd/system/autobyteus-nfs-ganesha.service; ! systemctl is-active --quiet autobyteus-nfs-ganesha.service; sudo -n test -d /var/lib/autobyteus-nfs/ganesha/recovery; cat '+SRC+'/.autobyteus-nfs/storage.json; sha256sum '+SRC+'/project/preexisting.txt; cat '+SRC+'/project/relative.txt; stat -c "%d:%i:%u:%g:%a" '+SRC)
  assert UUID in q['stdout'] and hashlib.sha256(b'ORIGINAL_API003').hexdigest() in q['stdout'] and r['sourceIdentityBefore'] in q['stdout'] and 'API003_DOCKER_FSYNC' in q['stdout'];return q
 case('detach preserves original source marker bytes and recovery',detached)
 r['result']='Pass';save();event('Docker storage self-client lifecycle passed after prior startup reconciliation completed; no manual reconnect; not peer/physical/managedDocker-client proof')
except BaseException as x:r['result']='Fail';r['fatal']=repr(x);save();event('Fail/incomplete '+repr(x))
print(json.dumps({'result':r['result'],'fatal':r.get('fatal')}),flush=True)
