"""Public create/reconnect regression, no manual engine installation or reader bypass.
Only test-owned disposable Ubuntu guest; retain until subsequent owned lifecycle checks.
"""
from pathlib import Path
import json,subprocess as sp,time,shlex,hashlib
R=Path.cwd();E=Path(__file__).resolve().parent;T=E.parent.parent.parent;S=Path((E/'scratch-path.txt').read_text().strip());cfg=json.loads((E/'linux-resource.json').read_text());build=json.loads((E/'build-result.json').read_text());V=cfg['clone'];B='/home/admin/'+V+'-binary';SRC='/home/admin/'+V+'-source';ROOT='/Volumes/autobyteus-shared';tart='/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK/tools/tart.app/Contents/MacOS/tart';env={'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','HOME':str(S/'home'),'TART_HOME':cfg['privateTartHome'],'TART_NO_AUTO_PRUNE':'1'}
r={'vm':V,'source':SRC,'mountRoot':ROOT,'binary':build['binary'],'metadata':build['metadata'],'commands':[],'cases':[],'result':'Running'}
def save():(E/'linux-public-result.json').write_text(json.dumps(r,indent=2)+'\n')
def event(s):
 with (T/'api-e2e-test-case-ledger.md').open('a') as f:f.write('\n- '+time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())+' **Round3 V03-repro** — '+s+'\n')
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
r={'sourceIdentity':[s.st_dev,s.st_ino,s.st_uid,s.st_gid,stat.S_IMODE(s.st_mode)],'sourceHash':h(p/'project/preexisting.txt'),'sourceMarker':json.loads((p/'.autobyteus-nfs/storage.json').read_text()),'mountedHash':h(Path(MOUNT)/'project/preexisting.txt'),'mountedMarker':json.loads((Path(MOUNT)/'.autobyteus-nfs/storage.json').read_text()),'directoryDelegations':Path('/sys/module/nfs/parameters/directory_delegations').read_text().strip(),'uid':os.getuid(),'gid':os.getgid(),'groups':os.getgroups()};print(json.dumps(r))
""".replace('SOURCE',repr(SRC)).replace('MOUNT',repr(ROOT))
 return nongroups('python3 -c '+shlex.quote(code))
try:
 pre=case('fresh reference preflight and nonempty original source',lambda:g('set -e; test "$(id -u)" = 1000; test "$(id -g)" = 109; id; cat /etc/os-release; test "$(uname -r)" = 7.0.0-38-generic; test "$(findmnt -no FSTYPE /)" = ext4; test ! -e /var/lib/autobyteus-nfs; test ! -e /etc/autobyteus-nfs; test ! -e '+ROOT+'; ! dpkg-query -W nfs-ganesha; test ! -e /etc/systemd/system/nfs-ganesha.service; mkdir -m 755 '+SRC+'; mkdir -m 755 '+SRC+'/project; printf ORIGINAL_API003 > '+SRC+'/project/preexisting.txt; stat -c "%d:%i:%u:%g:%a" '+SRC+'; sha256sum '+SRC+'/project/preexisting.txt; ip -4 -j addr show scope global'))
 r['sourceIdentityBefore']=g('stat -c "%d:%i:%u:%g:%a" '+SRC)['stdout'].strip();addr=json.loads(g('ip -4 -j addr show scope global')['stdout']);ips=[x['local'] for n in addr for x in n['addr_info'] if x['family']=='inet'];assert len(ips)==1;ip=ips[0];r['endpoint']=ip
 data=Path(build['binary']['path']).read_bytes();assert hashlib.sha256(data).hexdigest()==build['binary']['sha256'];cmd(['exec','-i',V,'/bin/sh','-c','umask 077; cat > '+B+'; chmod 755 '+B],data=data);assert build['binary']['sha256'] in g('sha256sum '+B)['stdout']
 identity=nongroups('python3 -c "import os,json; print(json.dumps([os.getuid(),os.getgid(),os.getgroups()]))"');assert json.loads(identity['stdout'])==[1000,109,[]]
 q=case('one public bundled create under077 exact nonroot identity',lambda:nongroups('umask 077; exec '+B+' create --source '+SRC+' --backend ganesha-native --endpoint '+ip+' --allow '+ip+' --nodes none --yes --json',timeout=600))
 payload=json.loads(q['stdout']);assert payload['status']['hostReady'] is True;r['connection']=payload['connection'];save()
 def prove():
  q=snapshot();v=json.loads(q['stdout']);assert v['uid']==1000 and v['gid']==109 and v['groups']==[];assert v['directoryDelegations']=='Y';assert v['sourceMarker']==v['mountedMarker']=={'storageId':payload['connection']['storageId']};assert v['sourceHash']==v['mountedHash']==hashlib.sha256(b'ORIGINAL_API003').hexdigest();assert ':'.join(map(str,v['sourceIdentity'][:4]))+':'+oct(v['sourceIdentity'][4])[2:]==r['sourceIdentityBefore'];return q
 case('original source identity and mounted bytes UUID defaultY',prove)
 def installed():
  q=g('set -e; sudo -n systemctl is-active autobyteus-nfs.service autobyteus-nfs-ganesha.service; sudo -n test ! -e /var/lib/autobyteus-nfs/pending-setup.json; sudo -n test ! -e /var/lib/autobyteus-nfs/package-mask.json; test ! -e /etc/systemd/system/nfs-ganesha.service; sudo -n find /var/lib/autobyteus-nfs -maxdepth 1 -type d -name "engine-install-*"; dpkg-query -W -f=\'${Package} ${Status} ${Version} ${Architecture}\\n\' nfs-common nfs-ganesha nfs-ganesha-vfs; sudo -n stat -c "%u %a %n" /var/lib/autobyteus-nfs /var/lib/autobyteus-nfs/attachment.json /etc/autobyteus-nfs/attachment.json; sha256sum /usr/libexec/autobyteus-nfs/autobyteus-nfs; findmnt -n -o FSTYPE,OPTIONS '+ROOT)
  assert q['stdout'].count('install ok installed 4.3-8ubuntu1+autobyteus1 arm64')==2;assert 'engine-install-' not in q['stdout'];assert build['binary']['sha256'] in q['stdout'];assert '0 700 /var/lib/autobyteus-nfs\n' in q['stdout'] and '0 600 /var/lib/autobyteus-nfs/attachment.json' in q['stdout'] and '0 644 /etc/autobyteus-nfs/attachment.json' in q['stdout'];assert 'vers=4.1' in q['stdout'] and ',hard,' in q['stdout'];return q
 case('installed exact engine private modes mask staging cleanup managed jobs',installed)
 for i in range(2):
  q=case('public reconnect '+str(i+1),lambda:nongroups(B+' reconnect --yes --json',timeout=90));v=json.loads(q['stdout']);assert v['status']['hostReady'] and v['connection']==payload['connection']
 case('post reconnect original source and mounted identity preserved',prove)
 r['result']='Pass';r['priorFailureResolution']='API-F002 resolved at fresh public nativeUbuntu create/reconnect scope; broader matrix still required';save();event(r['priorFailureResolution'])
except BaseException as x:
 r['result']='Fail';r['fatal']=repr(x);save();event('Fail/incomplete '+repr(x))
 try:r['diagnostics']=g('id; findmnt -t nfs,nfs4; sudo -n systemctl status autobyteus-nfs.service autobyteus-nfs-ganesha.service --no-pager; sudo -n cat /var/lib/autobyteus-nfs/ganesha/engine.log; sudo -n ls -la /var/lib/autobyteus-nfs; cat /sys/module/nfs/parameters/directory_delegations; dpkg-query -W nfs-common nfs-ganesha nfs-ganesha-vfs; sha256sum '+SRC+'/project/preexisting.txt',check=False);save()
 except BaseException as y:r['diagnosticError']=repr(y);save()
print(json.dumps({'result':r['result'],'fatal':r.get('fatal')}),flush=True)
