from pathlib import Path
import json,subprocess as sp,time,uuid,hashlib
R=Path.cwd();E=Path(__file__).resolve().parent;T=E.parent.parent.parent
C=Path('/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK');tart=str(C/'tools/tart.app/Contents/MacOS/tart');env={'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','HOME':str(C/'driver-home'),'TART_HOME':str(C/'tart-state'),'TART_NO_AUTO_PRUNE':'1'}
name='ab-nfs-api006-mac-'+uuid.uuid4().hex[:8];image='ghcr.io/cirruslabs/macos-tahoe-base@sha256:87f3aa5ce21b5c876268f233bdfecf38b4c2a8116fe9bbb718e714cbae187377'
r={'clone':name,'image':image,'tartHome':env['TART_HOME'],'commands':[],'result':'Preparing','noHostShares':True,'noUserCredentials':True}
def save():(E/'mac-peer-resource.json').write_text(json.dumps(r,indent=2)+'\n')
def cmd(a,t=60,data=None,check=True):
 p=sp.run([tart,*a],env=env,input=data,capture_output=True,timeout=t);q={'argv':[tart,*a],'rc':p.returncode,'stdout':p.stdout.decode(errors='replace'),'stderr':p.stderr.decode(errors='replace')};r['commands'].append(q);save()
 if check:assert p.returncode==0,q
 return q
try:
 save();cmd(['clone',image,name],120);cmd(['set',name,'--cpu','2','--memory','4096'])
 with (E/'mac-peer-boot.log').open('w') as f:p=sp.Popen([tart,'run',name,'--no-graphics','--no-audio','--no-clipboard','--no-usb-accessories'],env=env,stdout=f,stderr=sp.STDOUT,start_new_session=True)
 r['vmPid']=p.pid;save()
 for i in range(80):
  assert p.poll() is None,'owned VM exited'
  try:
   q=cmd(['exec',name,'/usr/bin/sw_vers'],t=5,check=False)
   if q['rc']==0:break
  except sp.TimeoutExpired:pass
  time.sleep(2)
 else:raise RuntimeError('Mac guest not ready')
 r['ip']=cmd(['exec',name,'/usr/sbin/ipconfig','getifaddr','en0'])['stdout'].strip();b=R/'autobyteus-nfs/out/ir009-local-candidate/autobyteus-nfs-darwin-arm64';h=hashlib.sha256(b.read_bytes()).hexdigest();assert h=='c79e5ac05367d6657bc0be74f2e8f5b9eb504af8ade265e1afdf0334218d0cf1';target='/Users/admin/'+name+'-binary';cmd(['exec','-i',name,'/usr/bin/sudo','-n','-u','admin','/bin/sh','-c','umask 077; cat > '+target+'; chmod 755 '+target],data=b.read_bytes());r['binary']={'guestPath':target,'sha256':h}
 r['result']='Ready';save()
except BaseException as x:r['result']='Incomplete';r['error']=repr(x);save()
print(json.dumps({k:r.get(k) for k in ['result','clone','vmPid','ip','error']}),flush=True)
