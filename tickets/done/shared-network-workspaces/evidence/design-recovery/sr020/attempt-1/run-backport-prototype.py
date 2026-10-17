"""Designer-only dependency feasibility, not implementation/API signoff.
Fresh private Ubuntu/ext4 VM; no host mounts/network changes or auth injection.
Rebuild exact distro source plus accepted upstream two-field correction; current
CLI copied-tree metadata only, preinstalled candidate packages (installer unproven).
All commands/output and cleanup retained; source/product files never modified.
"""
from pathlib import Path
import subprocess as sp,tempfile,json,time,uuid,shlex,shutil,hashlib,os,tarfile
R=Path.cwd();E=Path(__file__).resolve().parent;S=Path(tempfile.mkdtemp(prefix='ab-nfs-sr020-'));VM='ab-nfs-sr020-'+uuid.uuid4().hex[:8]
TART='/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK/tools/tart.app/Contents/MacOS/tart'
IMAGE='ghcr.io/cirruslabs/ubuntu@sha256:94dbb9c4b94db827a208fea301cf33eacdcbfb801155b5702b9e2faa52473a2e'
PV='4.3-8ubuntu1+autobyteus1';env={'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','HOME':str(S/'home'),'TART_HOME':str(S/'tart-state'),'TART_NO_AUTO_PRUNE':'1'}
for x in ['home','tmp']: (S/x).mkdir()
p=None;r={'kind':'Designer dependency prototype, not qualification','scratch':str(S),'vm':VM,'image':IMAGE,'commands':[],'result':'Running','packageVersion':PV}
def save(): (E/'backport-prototype.json').write_text(json.dumps(r,indent=2)+'\n')
def cmd(a,timeout=60,check=True,data=None,cwd=None,extraenv=None):
 start=time.monotonic()
 try:
  q=sp.run(a,env=extraenv or env,cwd=cwd,input=data,capture_output=True,timeout=timeout)
  row={'argv':a,'cwd':str(cwd) if cwd else None,'rc':q.returncode,'seconds':round(time.monotonic()-start,3),'stdout':q.stdout.decode(errors='replace'),'stderr':q.stderr.decode(errors='replace')}
 except sp.TimeoutExpired as ex:
  row={'argv':a,'timeout':timeout,'stdout':(ex.stdout or b'').decode(errors='replace'),'stderr':(ex.stderr or b'').decode(errors='replace')};r['commands'].append(row);save();raise
 r['commands'].append(row);save()
 if check and q.returncode: raise RuntimeError(row['stderr'][-3000:]+row['stdout'][-3000:])
 return row
def g(code,**kw): return cmd([TART,'exec',VM,'/usr/bin/env','-i','HOME=/home/admin','PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin','LANG=C','/bin/sh','-c',code],**kw)
def put(path,data): return cmd([TART,'exec','-i',VM,'/bin/sh','-c','umask 077; cat > '+shlex.quote(path)],data=data.encode() if isinstance(data,str) else data)
def step(s): r['stage']=s;save();print(s,flush=True)
try:
 step('prepare verified toolchain and copied current CLI')
 cmd(['curl','--fail','--location','--connect-timeout','10','--max-time','120','-o',str(S/'go.tar.gz'),'https://dl.google.com/go/go1.27.2.darwin-arm64.tar.gz'],timeout=130)
 sha=hashlib.sha256((S/'go.tar.gz').read_bytes()).hexdigest();assert sha=='76812b213b1b2302c978d28fa52fa92d541704b9e7d9d5db8002c50e4018c4c5',sha;r['goArchiveSha256']=sha
 with tarfile.open(S/'go.tar.gz') as tf:
  for m in tf.getmembers(): assert not m.name.startswith('/') and '..' not in Path(m.name).parts and not m.issym() and not m.islnk()
  tf.extractall(S)
 copy=S/'nfs-candidate';shutil.copytree(R/'autobyteus-nfs',copy)
 meta=json.loads(sp.check_output(['python3','autobyteus-nfs/packaging/release.py','--tag','v'+json.loads((R/'autobyteus-web/package.json').read_text())['version']],cwd=R))
 meta['ubuntuPackages']['nfs-ganesha']=PV;meta['ubuntuPackages']['nfs-ganesha-vfs']=PV
 (copy/'cmd/autobyteus-nfs/release.json').write_text(json.dumps(meta,indent=2)+'\n');assert meta['qualifiedTargets']==[];r['metadata']=meta
 diff=[str(x.relative_to(R/'autobyteus-nfs')) for x in (R/'autobyteus-nfs').rglob('*') if x.is_file() and x.read_bytes()!=(copy/x.relative_to(R/'autobyteus-nfs')).read_bytes()];assert diff==['cmd/autobyteus-nfs/release.json'];r['copiedTreeDelta']=diff
 benv={**env,'TMPDIR':str(S/'tmp'),'GOTOOLCHAIN':'local','GOOS':'linux','GOARCH':'arm64','CGO_ENABLED':'0'}
 cmd([str(S/'go/bin/go'),'build','-trimpath','-o',str(S/'autobyteus-nfs'),'./cmd/autobyteus-nfs'],cwd=copy,extraenv=benv,timeout=180)
 r['binarySha256']=hashlib.sha256((S/'autobyteus-nfs').read_bytes()).hexdigest()
 step('clone fresh owned VM '+VM)
 cmd([TART,'clone',IMAGE,VM],timeout=600);cmd([TART,'set',VM,'--cpu','4','--memory','6144'])
 log=(E/'backport-boot.log').open('w');p=sp.Popen([TART,'run',VM,'--no-graphics','--no-audio','--no-clipboard','--no-usb-accessories'],env=env,stdout=log,stderr=sp.STDOUT,start_new_session=True);r['vmPid']=p.pid;save()
 for _ in range(60):
  try:
   q=g('id; uname -a; cat /etc/os-release; findmnt -no FSTYPE /',timeout=5,check=False)
   if q['rc']==0:break
  except sp.TimeoutExpired:pass
  if p.poll() is not None: raise RuntimeError('VM exited')
  time.sleep(2)
 else:raise RuntimeError('guest not ready')
 g('set -e; test "$(id -u)" = 1000; test "$(id -g)" = 109; test "$(findmnt -no FSTYPE /)" = ext4; sudo -n true; test ! -e /var/lib/autobyteus-nfs; test ! -e /Volumes/autobyteus-shared')
 addr=json.loads(g('ip -4 -j addr show scope global')['stdout']);ip=[a['local'] for n in addr for a in n['addr_info'] if a['family']=='inet'][0];r['endpoint']=ip
 step('fetch authenticated exact Ubuntu source and build dependencies in guest')
 g("set -e; sudo -n sed -i 's/^Types: deb$/Types: deb deb-src/' /etc/apt/sources.list.d/ubuntu.sources; sudo -n apt-get update -qq; sudo -n env DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends build-essential devscripts equivs; mkdir /home/admin/backport; cd /home/admin/backport; apt-get source nfs-ganesha=4.3-8ubuntu1; sha256sum *.dsc *.tar.*; sudo -n env DEBIAN_FRONTEND=noninteractive apt-get build-dep -y nfs-ganesha=4.3-8ubuntu1",timeout=900)
 g('cd /home/admin/backport; echo "ffa76c26b12d23b67dcda184d7ec7ae55a42d1d14bf84bb7c0cf0134156ba3ca  nfs-ganesha_4.3-8ubuntu1.dsc" | sha256sum -c; cat nfs-ganesha_4.3-8ubuntu1.dsc; cat nfs-ganesha-4.3/debian/rules; cat nfs-ganesha-4.3/debian/patches/series')
 patch="""from pathlib import Path
import difflib,hashlib,json
p=Path('/home/admin/backport/nfs-ganesha-4.3/src/Protocols/NFS/nfs4_Compound.c');s=p.read_text();a=s.index('[NFS4_OP_GET_DIR_DELEGATION]');b=s.index('[NFS4_OP_GETDEVICEINFO]',a);old=s[a:b];assert old.count('nfs4_op_illegal')==2
new=old.replace('nfs4_op_illegal','nfs4_op_notsupp');out=s[:a]+new+s[b:];p.write_text(out);print(json.dumps({'before':hashlib.sha256(s.encode()).hexdigest(),'after':hashlib.sha256(out.encode()).hexdigest()}));print(''.join(difflib.unified_diff(s.splitlines(True),out.splitlines(True),fromfile='a/src/Protocols/NFS/nfs4_Compound.c',tofile='b/src/Protocols/NFS/nfs4_Compound.c')))
"""
 put('/home/admin/patch.py',patch);r['patch']=g('python3 /home/admin/patch.py')['stdout'];save()
 step('build two-field upstream backport as local prototype Debian packages')
 g("set -e; cd /home/admin/backport/nfs-ganesha-4.3; EDITOR=/bin/true dpkg-source --commit . autobyteus-get-dir-delegation.patch; DEBFULLNAME='AutoByteus Prototype' DEBEMAIL='prototype@example.invalid' dch --newversion "+PV+" --distribution noble 'Design experiment only: backport upstream 98eb77c4fd94effa6882b214698a77752ec79f6e'; dpkg-buildpackage -b -us -uc -j4 > /home/admin/backport-build.log 2>&1",timeout=1200)
 r['packageProof']=g('cd /home/admin/backport; sha256sum nfs-ganesha_'+PV+'_arm64.deb nfs-ganesha-vfs_'+PV+'_arm64.deb; dpkg-deb -f nfs-ganesha_'+PV+'_arm64.deb Package Version Architecture Depends; dpkg-deb -f nfs-ganesha-vfs_'+PV+'_arm64.deb Package Version Architecture Depends; cat nfs-ganesha-4.3/debian/patches/autobyteus-get-dir-delegation.patch; tail -50 /home/admin/backport-build.log')['stdout'];save()
 step('preinstall prototype packages without distribution daemon; public create remains fresh')
 g('set -e; sudo -n systemctl mask nfs-ganesha.service; sudo -n env DEBIAN_FRONTEND=noninteractive apt-get install -y /home/admin/backport/nfs-ganesha_'+PV+'_arm64.deb /home/admin/backport/nfs-ganesha-vfs_'+PV+'_arm64.deb nfs-common=1:2.6.4-3ubuntu5.1; sudo -n systemctl unmask nfs-ganesha.service; sudo -n systemctl daemon-reload; dpkg-query -W nfs-common nfs-ganesha nfs-ganesha-vfs; uname -r',timeout=300)
 BIN='/home/admin/ab-sr020-binary';SRC='/home/admin/ab-sr020-source';ROOT='/Volumes/autobyteus-shared';r.update(source=SRC,mountRoot=ROOT)
 put(BIN,(S/'autobyteus-nfs').read_bytes());g('chmod 755 '+BIN+'; sha256sum '+BIN+'; '+BIN+' version; mkdir -m755 '+SRC+'; mkdir -m755 '+SRC+'/project; printf ORIGINAL_SR020 > '+SRC+'/project/original.txt')
 r['identityBefore']=g('stat -c "%d:%i:%u:%g:%a" '+SRC)['stdout'].strip()
 invocation='umask 077; exec '+BIN+' create --source '+SRC+' --backend ganesha-native --endpoint '+ip+' --allow '+ip+' --nodes none --yes --json';r['invocation']=invocation
 step('current public create with candidate packages and default directory delegations')
 q=g(invocation,timeout=600);payload=json.loads(q['stdout']);assert payload['status']['hostReady'];r['create']=q;r['connection']=payload['connection'];save()
 q=g('set -e; cat /sys/module/nfsv4/parameters/directory_delegations; findmnt -no SOURCE,FSTYPE,OPTIONS '+ROOT+'; stat -c "%d:%i:%u:%g:%a" '+SRC+'; sha256sum '+SRC+'/project/original.txt '+ROOT+'/project/original.txt; cat '+SRC+'/.autobyteus-nfs/storage.json; cat '+ROOT+'/.autobyteus-nfs/storage.json; sudo -n systemctl is-active autobyteus-nfs.service autobyteus-nfs-ganesha.service; sudo -n stat -c "%u %a %n" /var/lib/autobyteus-nfs /var/lib/autobyteus-nfs/attachment.json /etc/autobyteus-nfs/attachment.json; sudo -n test ! -e /var/lib/autobyteus-nfs/pending-setup.json')
 assert q['stdout'].splitlines()[0]=='Y';assert r['identityBefore'] in q['stdout'];assert q['stdout'].count(hashlib.sha256(b'ORIGINAL_SR020').hexdigest())==2;assert q['stdout'].count(payload['connection']['storageId'])==2;r['preservation']=q;save()
 step('exact nonroot confined directory replay plus ordinary files')
 probe="""import os,json
from pathlib import Path
p=Path('/Volumes/autobyteus-shared/project');root='/Volumes/autobyteus-shared'
for i in range(60):
 withfd=os.open(root,os.O_RDONLY|os.O_CLOEXEC)
 for j in range(2):
  d=os.open('.autobyteus-nfs',os.O_RDONLY|os.O_CLOEXEC|os.O_NOFOLLOW|os.O_DIRECTORY,dir_fd=withfd)
  os.stat('storage.json',dir_fd=d,follow_symlinks=False)
  f=os.open('storage.json',os.O_RDONLY|os.O_CLOEXEC|os.O_NOFOLLOW,dir_fd=d); data=os.read(f,4096);os.close(f);os.close(d);assert json.loads(data)['storageId']
 os.close(withfd)
f=(p/'write.txt').open('w');f.write('SR020_READ_MODIFY');f.flush();os.fsync(f.fileno());f.close();os.rename(p/'write.txt',p/'renamed.txt');os.symlink('renamed.txt',p/'relative.txt');assert (p/'relative.txt').read_text()=='SR020_READ_MODIFY';print('60 directory replay iterations and ordinary write/fsync/rename/symlink Pass')
"""
 put('/home/admin/probe.py',probe);r['operations']=g('sudo -n setpriv --reuid=1000 --regid=109 --clear-groups env -i PATH=/usr/bin:/bin HOME=/var/empty LANG=C python3 /home/admin/probe.py; cat '+SRC+'/project/renamed.txt');assert '60 directory' in r['operations']['stdout'];assert 'SR020_READ_MODIFY' in r['operations']['stdout']
 step('public reconnect twice retains identity')
 r['reconnects']=[]
 for i in range(2):
  q=g(BIN+' reconnect --yes --json',timeout=120);assert json.loads(q['stdout'])['hostReady'];r['reconnects'].append(q);save()
 g('test "$(cat /sys/module/nfsv4/parameters/directory_delegations)" = Y; cat '+SRC+'/project/original.txt; cat '+ROOT+'/project/original.txt')
 r['result']='Prototype Pass, not product qualification';save()
except BaseException as ex:
 r['result']='Prototype Incomplete';r['error']=repr(ex);print(repr(ex),flush=True)
 if p is not None and p.poll() is None:
  try:r['failureDiagnostics']=g('tail -90 /home/admin/backport-build.log; sudo -n cat /var/lib/autobyteus-nfs/ganesha/engine.log; dpkg-query -W nfs-common nfs-ganesha nfs-ganesha-vfs; findmnt',check=False,timeout=35)
  except BaseException as z:r['failureDiagnosticError']=repr(z)
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
