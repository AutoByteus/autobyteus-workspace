"""Public create/reconnect regression, no manual engine installation or reader bypass.
Only test-owned disposable Ubuntu guest; retain until subsequent owned lifecycle checks.
"""
from pathlib import Path
import json,subprocess as sp,time,shlex,hashlib
R=Path.cwd();E=Path(__file__).resolve().parent;T=E.parent.parent.parent;S=Path((E/'scratch-path.txt').read_text().strip());cfg=json.loads((E/'linux-resource.json').read_text());build=json.loads((E/'build-result.json').read_text());V=cfg['clone'];B='/home/admin/'+V+'-binary';SRC='/home/admin/'+V+'-native-source';ROOT='/Volumes/autobyteus-shared';tart='/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK/tools/tart.app/Contents/MacOS/tart';env={'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','HOME':str(S/'home'),'TART_HOME':cfg['privateTartHome'],'TART_NO_AUTO_PRUNE':'1'}
r={'vm':V,'source':SRC,'mountRoot':ROOT,'binary':build['binary'],'metadata':build['metadata'],'commands':[],'cases':[],'result':'Running'}
def save():(E/RESULT).write_text(json.dumps(r,indent=2)+'\n')
def event(s):
 with (T/'api-e2e-test-case-ledger.md').open('a') as f:f.write('\n- '+time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())+' **Round6** — '+s+'\n')
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
