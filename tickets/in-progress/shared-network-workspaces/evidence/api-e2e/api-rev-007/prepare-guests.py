from pathlib import Path
import json,subprocess as sp,time,uuid,hashlib
R=Path.cwd();E=Path(__file__).resolve().parent;S=Path((E/'scratch-path.txt').read_text().strip());C=Path('/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK');tart=str(C/'tools/tart.app/Contents/MacOS/tart')
r={'result':'Preparing','guests':{},'commands':[]};out=E/'guests.json'
def save():out.write_text(json.dumps(r,indent=2)+'\n')
def cmd(args,env,t=60,data=None):
 p=sp.run([tart,*args],env=env,input=data,capture_output=True,timeout=t);q={'args':args,'rc':p.returncode,'stdout':p.stdout.decode(errors='replace'),'stderr':p.stderr.decode(errors='replace')};r['commands'].append(q);save();assert p.returncode==0,q;return q
for osname,img,th,home in [('mac','ghcr.io/cirruslabs/macos-tahoe-base@sha256:87f3aa5ce21b5c876268f233bdfecf38b4c2a8116fe9bbb718e714cbae187377',C/'tart-state',C/'driver-home'),('linux','ghcr.io/cirruslabs/ubuntu@sha256:94dbb9c4b94db827a208fea301cf33eacdcbfb801155b5702b9e2faa52473a2e',S/'tart-state',S/'home')]:
 name='ab-nfs-api007-'+osname+'-'+uuid.uuid4().hex[:8];env={'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','HOME':str(home),'TART_HOME':str(th),'TART_NO_AUTO_PRUNE':'1'};row={'name':name,'image':img,'env':env,'tart':tart};r['guests'][osname]=row;save()
 print('Cloning '+osname,flush=True);cmd(['clone',img,name],env,900);cmd(['set',name,'--cpu','4','--memory','8192','--disk-size','100'],env)
 with (E/(osname+'-nat-boot.log')).open('w') as f:p=sp.Popen([tart,'run',name,'--no-graphics','--no-audio','--no-clipboard','--no-usb-accessories'],env=env,stdout=f,stderr=sp.STDOUT,start_new_session=True)
 row['pid']=p.pid;row['runArgv']=p.args;save()
 for i in range(90):
  assert p.poll() is None,'VM exited'
  try:
   q=sp.run([tart,'exec',name,'/bin/sh','-c','uname -a; id'],env=env,capture_output=True,text=True,timeout=5)
   if q.returncode==0:row['preflight']=q.stdout;break
  except sp.TimeoutExpired:pass
  time.sleep(2)
 else:raise RuntimeError('guest not ready')
 binary=R/('autobyteus-nfs/out/ir009-local-candidate/autobyteus-nfs-'+('darwin' if osname=='mac' else 'linux')+'-arm64');target='/Users/admin/api007-nfs' if osname=='mac' else '/home/admin/api007-nfs';cmd(['exec','-i',name,'/bin/sh','-c','cat > '+target+'; chmod 755 '+target],env,data=binary.read_bytes());row['binary']={'path':target,'sha256':hashlib.sha256(binary.read_bytes()).hexdigest()};row['ready']=True;save();print('Ready '+osname,flush=True)
r['result']='Ready';save()
