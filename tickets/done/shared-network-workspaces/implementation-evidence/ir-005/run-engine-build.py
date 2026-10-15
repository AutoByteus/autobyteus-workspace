"""Personal isolated package build, not API/product or release qualification.
No host share/mount/credentials/provider or user Docker; owns one VM and scratch.
Preserves exact generated candidate outputs locally for subsequent scoped checks.
"""
from pathlib import Path
import subprocess as sp,tempfile,json,time,uuid,shlex,shutil,hashlib,os,tarfile,io
R=Path.cwd();E=Path(__file__).resolve().parent;S=Path(tempfile.mkdtemp(prefix='ab-nfs-ir005-'));VM='ab-nfs-ir005-build-'+uuid.uuid4().hex[:8]
TART='/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK/tools/tart.app/Contents/MacOS/tart'
IMAGE='ghcr.io/cirruslabs/ubuntu@sha256:94dbb9c4b94db827a208fea301cf33eacdcbfb801155b5702b9e2faa52473a2e'
env={'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','HOME':str(S/'home'),'TART_HOME':str(S/'tart-state'),'TART_NO_AUTO_PRUNE':'1'}
(S/'home').mkdir();(E/'scratch-path.txt').write_text(str(S)+'\n')
p=None;r={'scope':'package build only; no product setup or mounts','scratch':str(S),'vm':VM,'image':IMAGE,'commands':[],'result':'Running'}
def save(): (E/'engine-build-result.json').write_text(json.dumps(r,indent=2)+'\n')
def cmd(a,timeout=60,check=True,data=None):
 start=time.monotonic();q=sp.run(a,env=env,input=data,capture_output=True,timeout=timeout)
 row={'argv':a,'rc':q.returncode,'seconds':round(time.monotonic()-start,3),'stdout':q.stdout.decode(errors='replace'),'stderr':q.stderr.decode(errors='replace')};r['commands'].append(row);save()
 if check and q.returncode:raise RuntimeError(row['stderr'][-3000:]+row['stdout'][-3000:])
 return row

def g(code,**kw):return cmd([TART,'exec',VM,'/usr/bin/env','-i','HOME=/home/admin','PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin','LANG=C','/bin/sh','-c',code],**kw)
def stage(s):r['stage']=s;save();print(s,flush=True)
try:
 stage('clone isolated Ubuntu builder')
 cmd([TART,'clone',IMAGE,VM],timeout=600);cmd([TART,'set',VM,'--cpu','4','--memory','6144'])
 log=(E/'engine-build-boot.log').open('w');p=sp.Popen([TART,'run',VM,'--no-graphics','--no-audio','--no-clipboard','--no-usb-accessories'],env=env,stdout=log,stderr=sp.STDOUT,start_new_session=True);r['vmPid']=p.pid;save()
 for _ in range(70):
  try:
   if g('true',check=False,timeout=8)['rc']==0:break
  except sp.TimeoutExpired:pass
  time.sleep(2)
 else:raise RuntimeError('Guest unavailable')
 stage('install build prerequisites, never candidate engine')
 g("set -e; sudo -n sed -i 's/^Types: deb$/Types: deb deb-src/' /etc/apt/sources.list.d/ubuntu.sources; sudo -n apt-get update -qq; sudo -n env DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends build-essential devscripts fakeroot curl ca-certificates lsb-release; sudo -n env DEBIAN_FRONTEND=noninteractive apt-get build-dep -y nfs-ganesha=4.3-8ubuntu1",timeout=1000)
 stream=io.BytesIO()
 with tarfile.open(fileobj=stream,mode='w') as tf:tf.add(R/'autobyteus-nfs/packaging/engine',arcname='engine',filter=lambda x:None if '__pycache__' in x.name else x)
 cmd([TART,'exec','-i',VM,'/bin/sh','-c','mkdir /home/admin/ir005; tar -xf - -C /home/admin/ir005'],data=stream.getvalue())
 stage('execute current production source recipe')
 g('cd /home/admin/ir005; python3 engine/build.py --work /home/admin/ir005/work --output /home/admin/ir005/output --base '+shlex.quote(IMAGE)+' > /home/admin/ir005/build.log 2>&1',timeout=1800)
 stage('retrieve exact package/source artifacts')
 q=sp.run([TART,'exec',VM,'tar','-cf','-','-C','/home/admin/ir005/output','.'],env=env,capture_output=True,timeout=120);assert q.returncode==0,q.stderr
 (S/'artifacts.tar').write_bytes(q.stdout);dest=S/'engine-artifacts';dest.mkdir()
 with tarfile.open(fileobj=io.BytesIO(q.stdout)) as tf:
  for m in tf.getmembers():assert not m.issym() and not m.islnk() and not m.name.startswith('/') and '..' not in Path(m.name).parts
  tf.extractall(dest)
 r['artifacts']=[{'name':x.name,'sha256':hashlib.sha256(x.read_bytes()).hexdigest(),'size':x.stat().st_size} for x in sorted(dest.iterdir())]
 r['manifest']=json.loads((dest/'engine-manifest.json').read_text());(E/'built-engine-manifest.json').write_text(json.dumps(r['manifest'],indent=2)+'\n');r['result']='Package build Pass; not installer/runtime qualification'
except BaseException as ex:r['result']='Fail';r['error']=repr(ex);print(repr(ex),flush=True)
finally:
 if p and p.poll() is None:
  try:
   row=g('cat /home/admin/ir005/build.log',check=False);(E/'engine-build.log').write_text(row['stdout'])
  except BaseException as ex:r['diagnosticError']=repr(ex)
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
 if clean['processExited']:
  shutil.rmtree(S/'tart-state',ignore_errors=True);clean['privateVMCacheRemoved']=not (S/'tart-state').exists()
 clean['candidateScratchRetainedForChecks']=str(S)
 (E/'engine-build-cleanup.json').write_text(json.dumps(clean,indent=2)+'\n');save();print(r['result'],flush=True)
