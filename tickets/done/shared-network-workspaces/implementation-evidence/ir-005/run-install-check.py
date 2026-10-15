"""Narrow real package-owner + Docker packaging check on one fresh disposable VM.
Not public create/reconnect/API validation: no NFS exports/mounts or agent nodes.
No candidate engine preinstall; same exact built pair for native helper and image.
"""
from pathlib import Path
import subprocess as sp,json,time,uuid,shlex,shutil,hashlib,io,tarfile
R=Path.cwd();E=Path(__file__).resolve().parent;S=Path((E/'scratch-path.txt').read_text().strip());V=S/'install-vm';V.mkdir()
VM='ab-nfs-ir005-install-'+uuid.uuid4().hex[:8];TART='/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK/tools/tart.app/Contents/MacOS/tart'
IMAGE='ghcr.io/cirruslabs/ubuntu@sha256:94dbb9c4b94db827a208fea301cf33eacdcbfb801155b5702b9e2faa52473a2e'
env={'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','HOME':str(S/'home'),'TART_HOME':str(V/'tart-state'),'TART_NO_AUTO_PRUNE':'1'}
p=None;r={'scope':'Narrow package owner / Docker package parity, not NFS product validation','vm':VM,'image':IMAGE,'scratch':str(V),'commands':[],'result':'Running'}
def save():(E/'install-result.json').write_text(json.dumps(r,indent=2)+'\n')
def cmd(a,timeout=60,check=True,data=None):
 start=time.monotonic()
 try:q=sp.run(a,env=env,input=data,capture_output=True,timeout=timeout)
 except sp.TimeoutExpired as ex:
  r['commands'].append({'argv':a,'timeout':timeout,'stdout':(ex.stdout or b'').decode(errors='replace'),'stderr':(ex.stderr or b'').decode(errors='replace')});save();raise
 row={'argv':a,'rc':q.returncode,'seconds':round(time.monotonic()-start,3),'stdout':q.stdout.decode(errors='replace'),'stderr':q.stderr.decode(errors='replace')};r['commands'].append(row);save()
 if check and q.returncode:raise RuntimeError(row['stderr'][-2500:]+row['stdout'][-2500:])
 return row

def g(code,**kw):return cmd([TART,'exec',VM,'/usr/bin/env','-i','HOME=/home/admin','PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin','LANG=C','/bin/sh','-c',code],**kw)
def put(path,data):return cmd([TART,'exec','-i',VM,'/bin/sh','-c','umask 077; cat > '+shlex.quote(path)],data=data)
def stage(s):r['stage']=s;save();print(s,flush=True)
try:
 stage('clone clean runtime VM (not builder)')
 cmd([TART,'clone',IMAGE,VM],timeout=800);cmd([TART,'set',VM,'--cpu','4','--memory','6144'])
 log=(E/'install-boot.log').open('w');p=sp.Popen([TART,'run',VM,'--no-graphics','--no-audio','--no-clipboard','--no-usb-accessories'],env=env,stdout=log,stderr=sp.STDOUT,start_new_session=True);r['vmPid']=p.pid;save()
 for _ in range(70):
  try:
   if g('true',check=False,timeout=8)['rc']==0:break
  except sp.TimeoutExpired:pass
  time.sleep(2)
 else:raise RuntimeError('Guest unavailable')
 r['preflight']=g('set -e; uname -a; test ! -e /var/lib/autobyteus-nfs; ! dpkg-query -W nfs-ganesha; ! command -v gcc; ! command -v docker; test ! -e /etc/systemd/system/nfs-ganesha.service; findmnt -t nfs,nfs4 || true')
 meta=json.loads((E/'install-check-binaries.json').read_text());r['binaryProvenance']=meta
 for name in ['package-fixture','bad-package-fixture']:
  data=(S/name).read_bytes();assert hashlib.sha256(data).hexdigest()==next(x['sha256'] for x in meta['binaries'] if x['name']==name)
  put('/home/admin/'+name,data);g('chmod 755 /home/admin/'+name)
 stage('corrupt embedded bytes refused before any engine installation')
 q=g("sudo -n /bin/sh -c 'umask 077; exec /home/admin/bad-package-fixture --owned-vm-install-only'",check=False)
 assert q['rc']!=0 and 'digest mismatch' in q['stderr'];r['negative']=q
 g('set -e; ! dpkg-query -W nfs-ganesha; test ! -e /etc/systemd/system/nfs-ganesha.service; sudo -n test ! -e /var/lib/autobyteus-nfs/package-mask.json')
 stage('actual production package owner installs from embedded pair under077 and admin lock')
 r['install']=g("sudo -n /bin/sh -c 'umask 077; exec /home/admin/package-fixture --owned-vm-install-only'",timeout=600)
 r['native']=g('set -e; dpkg-query -W -f=\'${Package} ${Status} ${Version} ${Architecture}\\n\' nfs-common nfs-ganesha nfs-ganesha-vfs; test ! -e /etc/systemd/system/nfs-ganesha.service; ! systemctl is-active --quiet nfs-ganesha.service; sudo -n test ! -e /var/lib/autobyteus-nfs/package-mask.json; sudo -n find /var/lib/autobyteus-nfs -maxdepth 1 -type d; sudo -n stat -c "%u:%g %a %n" /var/lib/autobyteus-nfs; sha256sum /usr/bin/ganesha.nfsd; dpkg-query -L nfs-ganesha-vfs; ! command -v gcc')
 assert 'engine-install-' not in r['native']['stdout'];assert r['native']['stdout'].count('4.3-8ubuntu1+autobyteus1 arm64')==2
 r['repeat']=g("sudo -n /home/admin/package-fixture --owned-vm-install-only",timeout=30)
 stage('build clean Docker image from the identical candidate artifacts')
 g('sudo -n apt-get update -qq; sudo -n env DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends docker.io; sudo -n systemctl start docker',timeout=600)
 stream=io.BytesIO()
 with tarfile.open(fileobj=stream,mode='w') as tf:
  tf.add(S/'engine-candidate',arcname='engine-candidate')
  for name in ['packaging/Dockerfile','THIRD_PARTY_NOTICES']:tf.add(R/'autobyteus-nfs'/name,arcname='autobyteus-nfs/'+name)
 cmd([TART,'exec','-i',VM,'/bin/sh','-c','mkdir /home/admin/image-context; tar -xf - -C /home/admin/image-context'],data=stream.getvalue())
 base=json.loads((R/'autobyteus-nfs/packaging/release-lock.json').read_text())['ubuntuBaseImage']
 r['dockerBuild']=g('cd /home/admin/image-context; sudo -n docker build --pull --build-arg UBUNTU_BASE='+shlex.quote(base)+' --build-arg TARGETARCH=arm64 -f autobyteus-nfs/packaging/Dockerfile -t ab-nfs-ir005:check .',timeout=900)
 r['docker']=g("sudo -n docker run --rm --network none --entrypoint /bin/sh ab-nfs-ir005:check -ec 'dpkg-query -W -f=\"\${Package} \${Status} \${Version} \${Architecture}\\n\" nfs-ganesha nfs-ganesha-vfs; sha256sum /usr/bin/ganesha.nfsd; cat /usr/share/autobyteus-nfs/engine-manifest.json; test ! -e /tmp/autobyteus-engine; ! command -v gcc'",timeout=45)
 assert r['docker']['stdout'].count('install ok installed 4.3-8ubuntu1+autobyteus1 arm64')==2
 nativehash=[x.split()[0] for x in r['native']['stdout'].splitlines() if x.endswith('/usr/bin/ganesha.nfsd')][0];assert nativehash in r['docker']['stdout']
 for pair in json.loads((E/'built-engine-manifest.json').read_text())['architectures']['arm64']['packages']:assert pair['sha256'] in r['docker']['stdout']
 r['noMounts']=g('findmnt -t nfs,nfs4 || true');assert not r['noMounts']['stdout'].strip()
 r['imageIdentity']=g('sudo -n docker image inspect ab-nfs-ir005:check --format "{{.Id}}"')
 r['result']='Narrow native package install and Docker parity Pass; no create/mount/API qualification'
except BaseException as ex:r['result']='Fail';r['error']=repr(ex);print(repr(ex),flush=True)
finally:
 save();clean={}
 try:clean['stop']=cmd([TART,'stop',VM],check=False)
 except BaseException as ex:clean['stopError']=repr(ex)
 if p:
  try:p.wait(timeout=30)
  except sp.TimeoutExpired:p.terminate();p.wait(timeout=20)
  clean['vmExitCode']=p.returncode
 try:clean['delete']=cmd([TART,'delete',VM],check=False);clean['list']=cmd([TART,'list','--format','json'],check=False)
 except BaseException as ex:clean['deleteError']=repr(ex)
 clean['processExited']=p is None or p.poll() is not None
 if clean['processExited']:shutil.rmtree(V);clean['privateVMCacheRemoved']=not V.exists()
 (E/'install-cleanup.json').write_text(json.dumps(clean,indent=2)+'\n');save();print(r['result'],flush=True)
