"""Reviewer-only boundary diagnostic, not a product fix or acceptance rerun.
Fresh owned Ubuntu VM / exact API002 image and packages. Replays observed openat
sequence with Python (not Go/product), then guest-only directory-delegation A/B/A.
No host mounts/network/root changes. Always retire exact clone and private cache.
"""
from pathlib import Path
import subprocess as sp, tempfile, json, time, uuid, shlex, shutil, hashlib, re
R=Path.cwd(); E=Path(__file__).resolve().parent
S=Path(tempfile.mkdtemp(prefix='ab-nfs-crr005-')); VM='ab-nfs-crr005-'+uuid.uuid4().hex[:8]
TART='/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK/tools/tart.app/Contents/MacOS/tart'
IMAGE='ghcr.io/cirruslabs/ubuntu@sha256:94dbb9c4b94db827a208fea301cf33eacdcbfb801155b5702b9e2faa52473a2e'
env={'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','HOME':str(S/'home'),'TART_HOME':str(S/'tart-state'),'TART_NO_AUTO_PRUNE':'1'}
(S/'home').mkdir(); p=None
r={'kind':'boundary diagnostic, not public create or fix validation','scratch':str(S),'vm':VM,'image':IMAGE,'commands':[],'result':'Running'}
def save(): (E/'linux-dir-diagnostic.json').write_text(json.dumps(r,indent=2)+'\n')
def cmd(a,timeout=60,check=True,data=None):
 start=time.monotonic()
 try:
  q=sp.run(a,env=env,input=data,capture_output=True,timeout=timeout)
  row={'argv':a,'rc':q.returncode,'seconds':round(time.monotonic()-start,3),'stdout':q.stdout.decode(errors='replace'),'stderr':q.stderr.decode(errors='replace')}
 except sp.TimeoutExpired as ex:
  row={'argv':a,'timeout':timeout,'stdout':(ex.stdout or b'').decode(errors='replace'),'stderr':(ex.stderr or b'').decode(errors='replace')};r['commands'].append(row);save();raise
 r['commands'].append(row);save()
 if check and q.returncode: raise RuntimeError(row['stderr'][-1800:]+row['stdout'][-1800:])
 return row
def g(code,**kw): return cmd([TART,'exec',VM,'/usr/bin/env','-i','HOME=/home/admin','PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin','LANG=C','/bin/sh','-c',code],**kw)
def put(path,data):
 return cmd([TART,'exec','-i',VM,'/bin/sh','-c','umask 077; cat > '+shlex.quote(path)],data=data.encode())
try:
 save(); print('clone '+VM,flush=True)
 cmd([TART,'clone',IMAGE,VM],timeout=600)
 cmd([TART,'set',VM,'--cpu','2','--memory','4096'])
 log=(E/'linux-dir-boot.log').open('w');p=sp.Popen([TART,'run',VM,'--no-graphics','--no-audio','--no-clipboard','--no-usb-accessories'],env=env,stdout=log,stderr=sp.STDOUT,start_new_session=True);r['vmPid']=p.pid;save()
 for _ in range(60):
  try:
   q=g('id; uname -a; cat /etc/os-release; findmnt -no FSTYPE /; ip -4 -j addr show scope global',timeout=5,check=False)
   if q['rc']==0:break
  except sp.TimeoutExpired: pass
  if p.poll() is not None:raise RuntimeError('VM exited')
  time.sleep(2)
 else: raise RuntimeError('guest not ready')
 addr=json.loads(g('ip -4 -j addr show scope global')['stdout']);ip=[a['local'] for n in addr for a in n['addr_info'] if a['family']=='inet'][0];r['endpoint']=ip
 g('test "$(id -u)" = 1000; test "$(id -g)" = 109; test "$(findmnt -no FSTYPE /)" = ext4; sudo -n true; test ! -e /var/lib/autobyteus-nfs; test ! -e /Volumes/autobyteus-shared')
 print('install exact guest dependencies',flush=True)
 g('sudo -n systemctl mask nfs-ganesha.service; sudo -n apt-get update -qq && sudo -n env DEBIAN_FRONTEND=noninteractive apt-get install -y nfs-common=1:2.6.4-3ubuntu5.1 nfs-ganesha=4.3-8ubuntu1 nfs-ganesha-vfs=4.3-8ubuntu1 tcpdump strace',timeout=480)
 r['packages']=g('dpkg-query -W nfs-common nfs-ganesha nfs-ganesha-vfs; uname -r')['stdout'];save()
 sid=str(uuid.uuid4());src='/home/admin/ab-crr005-source';r['source']=src;r['storageId']=sid
 g('umask 022; mkdir '+src+'; mkdir '+src+'/.autobyteus-nfs; printf ORIGINAL_CRR005 > '+src+'/original.txt; printf '+shlex.quote(json.dumps({'storageId':sid})+'\n')+' > '+src+'/.autobyteus-nfs/storage.json; sudo -n install -d -m700 /var/lib/autobyteus-nfs/ganesha/recovery; sudo -n install -d -m555 /Volumes/autobyteus-shared')
 template=(R/'autobyteus-nfs/internal/backend/ganesha.go').read_text().split('return fmt.Sprintf(`',1)[1].split('`, recovery',1)[0]
 conf=template % ('/var/lib/autobyteus-nfs/ganesha/recovery',src,sid,1000,109,ip)
 r['config']=conf;r['configTemplateSha256']=hashlib.sha256(template.encode()).hexdigest();save()
 put('/home/admin/ab-crr005-ganesha.conf',conf)
 g('sudo -n install -m600 /home/admin/ab-crr005-ganesha.conf /var/lib/autobyteus-nfs/ganesha/ganesha.conf; sudo -n systemctl is-active nfs-ganesha.service',check=False)
 g('sudo -n systemd-run --unit=ab-crr005-ganesha --property=UMask=0077 /usr/bin/ganesha.nfsd -F -f /var/lib/autobyteus-nfs/ganesha/ganesha.conf -L /var/lib/autobyteus-nfs/ganesha/engine.log -p /var/lib/autobyteus-nfs/ganesha/ganesha.pid')
 g('sudo -n systemctl is-active ab-crr005-ganesha.service; sudo -n systemctl is-active nfs-ganesha.service',check=False)
 g('sudo -n mount -t nfs -o hard,tcp,vers=4.1,actimeo=1,timeo=50,retrans=2 '+ip+':/autobyteus/'+sid+' /Volumes/autobyteus-shared',timeout=90)
 g('findmnt -no SOURCE,FSTYPE,OPTIONS /Volumes/autobyteus-shared; cat /sys/module/nfsv4/parameters/directory_delegations; cat /Volumes/autobyteus-shared/original.txt; cat /Volumes/autobyteus-shared/.autobyteus-nfs/storage.json; stat -c "%d:%i:%u:%g:%a" '+src)
 probe='''import os,sys,json
root=sys.argv[1];results=[]
for attempt in range(3):
 fds=[];row={'attempt':attempt}
 try:
  a=os.open(root,os.O_RDONLY|os.O_CLOEXEC);fds.append(a)
  b=os.open(root,os.O_RDONLY|os.O_CLOEXEC);fds.append(b)
  flags=os.O_RDONLY|os.O_NOFOLLOW|os.O_CLOEXEC|os.O_DIRECTORY
  row['step']='first directory open';d=os.open('.autobyteus-nfs',flags,dir_fd=b);fds.append(d)
  row['step']='lstat marker';os.stat('storage.json',dir_fd=d,follow_symlinks=False)
  os.close(d);fds.remove(d)
  row['step']='second directory open';d=os.open('.autobyteus-nfs',flags,dir_fd=b);fds.append(d)
  row['step']='read marker';f=os.open('storage.json',os.O_RDONLY|os.O_NOFOLLOW|os.O_CLOEXEC,dir_fd=d);fds.append(f)
  row['bytes']=os.read(f,4096).decode();row['result']='Pass'
 except OSError as ex:row.update(result='Fail',errno=ex.errno,error=str(ex))
 finally:
  for fd in reversed(fds):os.close(fd)
 results.append(row)
print(json.dumps(results))
'''
 put('/home/admin/ab-crr005-probe.py',probe)
 g('sudo -n systemd-run --unit=ab-crr005-capture /usr/bin/tcpdump -i lo -s0 -U -w /home/admin/ab-crr005.pcap tcp port 2049')
 original=g('cat /sys/module/nfsv4/parameters/directory_delegations')['stdout'].strip();r['originalDirectoryDelegations']=original
 for label,value in [('original',original),('diagnostic_disabled','N'),('restored',original)]:
  if label!='original':g('printf '+value+' | sudo -n tee /sys/module/nfsv4/parameters/directory_delegations')
  print('diagnostic '+label,flush=True)
  q=g('cat /sys/module/nfsv4/parameters/directory_delegations; sudo -n setpriv --reuid=1000 --regid=109 --clear-groups env -i PATH=/usr/bin:/bin HOME=/var/empty LANG=C strace -f -e trace=openat,newfstatat,close python3 /home/admin/ab-crr005-probe.py /Volumes/autobyteus-shared',timeout=40)
  (E/('linux-dir-'+label+'.json')).write_text(json.dumps(q,indent=2)+'\n')
 g('sudo -n setpriv --reuid=1000 --regid=109 --clear-groups env -i PATH=/usr/bin:/bin HOME=/var/empty LANG=C python3 /home/admin/ab-crr005-probe.py '+src)
 g('sudo -n systemctl kill -s SIGINT ab-crr005-capture.service; sudo -n systemctl stop ab-crr005-capture.service',check=False)
 q=g('sudo -n tcpdump -nn -vvv -X -r /home/admin/ab-crr005.pcap',timeout=45)
 (E/'linux-dir-packets.log').write_text(q['stdout']+q['stderr'])
 g('cat /sys/module/nfsv4/parameters/directory_delegations; cat /Volumes/autobyteus-shared/original.txt; cat /Volumes/autobyteus-shared/.autobyteus-nfs/storage.json; sudo -n cat /var/lib/autobyteus-nfs/ganesha/engine.log')
 r['result']='Diagnostic Complete, not product Pass'
except BaseException as ex:r['result']='Diagnostic Incomplete';r['error']=repr(ex);print(repr(ex),flush=True)
finally:
 save();clean={}
 try:clean['stop']=cmd([TART,'stop',VM],check=False)
 except BaseException as ex:clean['stopError']=repr(ex)
 if p is not None:
  try:p.wait(timeout=30)
  except sp.TimeoutExpired:p.terminate();p.wait(timeout=20)
  clean['vmExitCode']=p.returncode
 try:clean['delete']=cmd([TART,'delete',VM],check=False);clean['list']=cmd([TART,'list','--format','json'],check=False)
 except BaseException as ex:clean['deleteError']=repr(ex)
 if p is None or p.poll() is not None:shutil.rmtree(S);clean['scratchAbsent']=not S.exists()
 clean['vmProcessAbsent']=p is None or p.poll() is not None
 (E/'cleanup.json').write_text(json.dumps(clean,indent=2)+'\n');save();print(json.dumps({'result':r['result'],'cleanup':clean.get('scratchAbsent')}),flush=True)
