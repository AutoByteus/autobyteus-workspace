"""Own disposable Mac clone + private Go toolchain, not product implementation."""
from pathlib import Path
import tempfile,json,subprocess as s,uuid,time,hashlib,urllib.request,tarfile
E=Path(__file__).resolve().parent
scratch=Path(tempfile.mkdtemp(prefix='nfs-sr023-',dir='/private/tmp'));(E/'scratch-path.txt').write_text(str(scratch)+'\n')
C=Path('/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK');tart=str(C/'tools/tart.app/Contents/MacOS/tart');env={'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','HOME':str(C/'driver-home'),'TART_HOME':str(C/'tart-state'),'TART_NO_AUTO_PRUNE':'1'}
name='ab-nfs-sr023-'+uuid.uuid4().hex[:8];image='ghcr.io/cirruslabs/macos-tahoe-base@sha256:87f3aa5ce21b5c876268f233bdfecf38b4c2a8116fe9bbb718e714cbae187377'
r={'clone':name,'image':image,'scratch':str(scratch),'env':env,'tart':tart,'commands':[],'result':'Preparing','noHostShares':True,'noCredentials':True}
def save():(E/'resource.json').write_text(json.dumps(r,indent=2)+'\n')
def cmd(args,t=60):
 p=s.run([tart,*args],env=env,capture_output=True,text=True,timeout=t);q={'argv':[tart,*args],'rc':p.returncode,'stdout':p.stdout,'stderr':p.stderr};r['commands'].append(q);save();assert p.returncode==0,q;return q
try:
 save();cmd(['list']);cmd(['clone',image,name],120);cmd(['set',name,'--cpu','2','--memory','4096'])
 with (E/'boot.log').open('w') as f:p=s.Popen([tart,'run',name,'--no-graphics','--no-audio','--no-clipboard','--no-usb-accessories'],env=env,stdout=f,stderr=s.STDOUT,start_new_session=True)
 r['vmPid']=p.pid;save()
 url='https://go.dev/dl/go1.27.2.darwin-arm64.tar.gz';dest=scratch/'go.tar.gz';urllib.request.urlretrieve(url,dest);h=hashlib.sha256(dest.read_bytes()).hexdigest();assert h=='76812b213b1b2302c978d28fa52fa92d541704b9e7d9d5db8002c50e4018c4c5'
 with tarfile.open(dest) as t:t.extractall(scratch,filter='data')
 (E/'toolchain.json').write_text(json.dumps({'url':url,'sha256':h,'bytes':dest.stat().st_size,'path':str(scratch/'go/bin/go')},indent=2)+'\n')
 for i in range(80):
  assert p.poll() is None
  try:cmd(['exec',name,'/usr/bin/sw_vers'],5);break
  except (s.TimeoutExpired,AssertionError):time.sleep(2)
 else:raise RuntimeError('own guest not ready')
 cmd(['exec',name,'/bin/sh','-c','id; /usr/bin/uname -a; /usr/sbin/sysctl -n kern.boottime; /usr/sbin/diskutil info -plist /System/Volumes/Data'])
 r['result']='Ready';save()
except BaseException as x:r.update(result='Incomplete',error=repr(x));save();raise
print(json.dumps({'result':r['result'],'clone':name,'scratch':str(scratch)}),flush=True)
