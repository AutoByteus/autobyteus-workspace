"""API002 V03: actual Ubuntu/ext4 native Ganesha CLI candidate, no host-root/data changes.
Build-only pinned metadata in disposable copy; not a release or independent physical proof.
VM remains owned/recorded until final cleanup or subsequent same-round permitted tests.
"""
from pathlib import Path
import subprocess as sp,json,time,hashlib,shlex,os
R=Path.cwd();E=Path(__file__).resolve().parent;T=R/'tickets/in-progress/shared-network-workspaces';S=Path((E/'scratch-path.txt').read_text().strip());cfg=json.loads((E/'linux-repro-resource.json').read_text());build=json.loads((E/'linux-candidate-build.json').read_text());C=Path('/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK');tart=str(C/'tools/tart.app/Contents/MacOS/tart');VM=cfg['clone'];BIN='/home/admin/'+VM+'-binary';SRC='/home/admin/'+VM+'-source';ROOT='/Volumes/autobyteus-shared'
env={'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','HOME':str(S/'home'),'TART_HOME':cfg['privateTartHome'],'TART_NO_AUTO_PRUNE':'1'};r={'vm':VM,'binary':build['binary'],'metadata':build['metadata'],'source':SRC,'mountRoot':ROOT,'commands':[],'cases':[]}
def save():(E/'linux-native-repro-result.json').write_text(json.dumps(r,indent=2)+'\n')
def event(s):
 with (T/'api-e2e-test-case-ledger.md').open('a') as f:f.write('\n- '+time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())+' **Round2 V03-repro native** — '+s+'\n')
 print(s,flush=True)
def cmd(a,check=True,timeout=30,data=None):
 start=time.monotonic()
 try:
  p=sp.run([tart,*a],env=env,capture_output=True,input=data,timeout=timeout);row={'argv':[tart,*a],'rc':p.returncode,'seconds':round(time.monotonic()-start,3),'stdout':p.stdout.decode(errors='replace'),'stderr':p.stderr.decode(errors='replace')}
 except sp.TimeoutExpired as x:
  row={'argv':[tart,*a],'timeout':timeout,'stdout':(x.stdout or b'').decode(errors='replace'),'stderr':(x.stderr or b'').decode(errors='replace')};r['commands'].append(row);save();raise
 r['commands'].append(row);save()
 if check and p.returncode:raise RuntimeError(row['stderr'][-5000:]+row['stdout'][-1500:])
 return row
def g(code,**kw):return cmd(['exec',VM,'/usr/bin/env','-i','HOME=/home/admin','PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin','LANG=C','/bin/sh','-c',code],**kw)
def case(name,fn):
 event('Started '+name);row={'name':name};start=time.monotonic()
 try:row['evidence']=fn();row['status']='Pass'
 except BaseException as x:row['status']='Fail';row['error']=repr(x);raise
 finally:row['seconds']=round(time.monotonic()-start,3);r['cases'].append(row);save();event(name+': '+row['status'])
 return row['evidence']
try:
 pre=case('fresh Ubuntu24 ext4/nonroot/source preflight',lambda:g('set -e; id; test "$(findmnt -no FSTYPE /)" = ext4; test ! -e /var/lib/autobyteus-nfs; test ! -e /etc/autobyteus-nfs; test ! -e '+ROOT+'; sudo -n true; mkdir -m 755 '+SRC+'; mkdir -m 755 '+SRC+'/project; printf ORIGINAL_API002_LINUX > '+SRC+'/project/preexisting.txt; stat -c "%d:%i:%u:%g:%a" '+SRC+'; sha256sum '+SRC+'/project/preexisting.txt; ip -4 -j addr show scope global'))
 identity=g('stat -c "%d:%i:%u:%g:%a" '+SRC)['stdout'].strip();r['sourceIdentityBefore']=identity
 addr=json.loads(g('ip -4 -j addr show scope global')['stdout']);ips=[a['local'] for n in addr for a in n['addr_info'] if a['family']=='inet'];assert len(ips)==1;ip=ips[0];r['endpoint']=ip;save()
 data=Path(build['binary']['path']).read_bytes();assert hashlib.sha256(data).hexdigest()==build['binary']['sha256'];cmd(['exec','-i',VM,'/bin/sh','-c','umask 077; cat > '+BIN+'; chmod 755 '+BIN],data=data);b=g('sha256sum '+BIN+'; '+BIN+' version');assert build['binary']['sha256'] in b['stdout']
 invocation='umask 077; exec '+BIN+' create --source '+SRC+' --backend ganesha-native --endpoint '+ip+' --allow '+ip+' --nodes none --yes --json'
 q=case('one public native Ganesha create from nonempty original source',lambda:g(invocation,timeout=600));payload=json.loads(q['stdout']);assert payload['status']['hostReady'];r['connection']=payload['connection']
 def proof():
  q=g('set -e; stat -c "%d:%i:%u:%g:%a" '+SRC+'; sha256sum '+SRC+'/project/preexisting.txt '+ROOT+'/project/preexisting.txt; cat '+SRC+'/.autobyteus-nfs/storage.json; cat '+ROOT+'/.autobyteus-nfs/storage.json; findmnt -no SOURCE,FSTYPE,OPTIONS '+ROOT+'; sudo -n systemctl is-active autobyteus-nfs.service autobyteus-nfs-ganesha.service; sudo -n stat -c "%u %a %n" /var/lib/autobyteus-nfs /var/lib/autobyteus-nfs/attachment.json /etc/autobyteus-nfs/attachment.json; sudo -n test ! -e /var/lib/autobyteus-nfs/pending-setup.json')
  assert q['stdout'].splitlines()[0]==identity
  expected=hashlib.sha256(b'ORIGINAL_API002_LINUX').hexdigest();assert q['stdout'].count(expected)==2;assert q['stdout'].count(payload['connection']['storageId'])==2;return q
 case('same source/UUID/bytes/modes and managed engine-service',proof)
 def ops():
  code="from pathlib import Path; import os; p=Path('"+ROOT+"/project'); f=(p/'native.txt').open('w'); f.write('LINUX_NATIVE'); f.flush(); os.fsync(f.fileno()); f.close(); os.rename(p/'native.txt',p/'renamed.txt'); os.symlink('renamed.txt',p/'relative.txt'); assert (p/'relative.txt').read_text()=='LINUX_NATIVE'; print('native ordinary files Pass')"
  q=g('python3 -c '+shlex.quote(code)+'; cat '+SRC+'/project/renamed.txt');assert 'LINUX_NATIVE' in q['stdout'];return q
 case('native mounted operations affect original ext4 source',ops)
 case('public reconnect preserves identity',lambda:g(BIN+' reconnect --yes --json',timeout=120))
 r['result']='Pass';save();event('Native scope Pass; other modes/peers/physical/runtime not inferred')
except BaseException as x:
 r['result']='Fail';r['fatal']=repr(x);save();event('Fail/incomplete '+repr(x))
 try:r['diagnostics']=g('id; findmnt; sudo -n systemctl status autobyteus-nfs.service autobyteus-nfs-ganesha.service --no-pager; sudo -n cat /var/lib/autobyteus-nfs/ganesha/engine.log; sudo -n ls -la /var/lib/autobyteus-nfs; sudo -n cat /etc/autobyteus-nfs/attachment.json; sha256sum '+SRC+'/project/preexisting.txt; dpkg-query -W nfs-common nfs-ganesha nfs-ganesha-vfs; apt-cache policy nfs-common nfs-ganesha nfs-ganesha-vfs',check=False,timeout=45)
 except BaseException as d:r['diagnosticError']=repr(d)
 save()
print(json.dumps({'result':r.get('result'),'fatal':r.get('fatal')}),flush=True)
