"""Own one private disposable Ubuntu VM for a dependency/config comparison only."""
from pathlib import Path
import subprocess as sp,json,uuid,time,tempfile,hashlib
E=Path(__file__).resolve().parent
S=Path(tempfile.mkdtemp(prefix='ab-nfs-sr022-'));(S/'home').mkdir()
tart='/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK/tools/tart.app/Contents/MacOS/tart'
image='ghcr.io/cirruslabs/ubuntu@sha256:94dbb9c4b94db827a208fea301cf33eacdcbfb801155b5702b9e2faa52473a2e';V='ab-nfs-sr022-'+uuid.uuid4().hex[:8]
env={'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','HOME':str(S/'home'),'TART_HOME':str(S/'tart'),'TART_NO_AUTO_PRUNE':'1'}
r={'vm':V,'image':image,'scratch':str(S),'tart':tart,'env':env,'commands':[],'result':'Preparing','scope':'Dependency experiment only; no host-root or host network change'}
def save():(E/'resource.json').write_text(json.dumps(r,indent=2)+'\n')
def cmd(args,timeout=30):
 p=sp.run([tart,*args],env=env,capture_output=True,text=True,timeout=timeout);q={'argv':[tart,*args],'rc':p.returncode,'stdout':p.stdout,'stderr':p.stderr};r['commands'].append(q);save();return q
save()
try:
 with (E/'download.log').open('w') as f:p=sp.run([tart,'clone',image,V],env=env,stdout=f,stderr=sp.STDOUT,timeout=600)
 r['cloneRC']=p.returncode;save();assert p.returncode==0
 assert cmd(['set',V,'--cpu','4','--memory','4096','--disk-size','30'])['rc']==0
 with (E/'boot.log').open('w') as f:p=sp.Popen([tart,'run',V,'--no-graphics','--no-audio','--no-clipboard','--no-usb-accessories'],env=env,stdout=f,stderr=sp.STDOUT,start_new_session=True)
 r['vmPid']=p.pid;save()
 for i in range(90):
  assert p.poll() is None,'VM exited'
  try:q=cmd(['exec',V,'/bin/sh','-c','id; uname -a; cat /etc/os-release; findmnt -no SOURCE,FSTYPE /; ip -4 -j addr show scope global'],5)
  except sp.TimeoutExpired:time.sleep(2);continue
  if q['rc']==0:r['preflight']=q;r['result']='Ready';break
  time.sleep(2)
 else:raise RuntimeError('guest not ready')
except BaseException as x:r['result']='Incomplete';r['error']=repr(x)
finally:save();print(json.dumps({'result':r['result'],'vm':V,'pid':r.get('vmPid'),'error':r.get('error')}),flush=True)
