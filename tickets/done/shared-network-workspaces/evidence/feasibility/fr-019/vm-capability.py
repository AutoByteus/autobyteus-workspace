"""Designer-owned, user-authorized disposable macOS VM capability.

Prerequisite: verified pinned Tart release/image in this round's private scratch.
No host mounts, directory shares, clipboard/audio/USB, bridge-to-LAN, host SSH or
administrator commands. Starts only this exact owned VM, probes native guest
control/OS/files/admin/NFS prerequisites, then stops it in finally. VM disk is
retained stopped for the next owned filesystem experiments; no provider secrets.
Not product setup, agent, filesystem-sharing or physical LAN proof.
"""
from pathlib import Path
import subprocess as sp,json,time,uuid,signal,sys,os
P=Path(__file__).resolve().parent
S=Path((P/'scratch-path.txt').read_text().strip()).resolve()
assert str(S).startswith('/private/tmp/ab-sf-macos-vm-fr019.') and S.is_dir()
T=S/'tools/tart.app/Contents/MacOS/tart'
V='ab-sf-fr019-macos'
E={'HOME':str(S/'driver-home'),'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','TART_HOME':str(S/'tart-state'),'TART_NO_AUTO_PRUNE':'1'}
R={'run':V,'scope':'owned native macOS VM automation capability, not shared filesystem/real agent/product setup/physical LAN/current source proof','commands':[],'cases':[],'cleanup':[],'hostAdminUsed':False,'hostDirectoryShares':False,'providerCredentials':False,'scratchRoot':str(S)}
proc=None; log=None; guestProof='/Users/admin/.ab-sf-fr019-'+uuid.uuid4().hex

def save():(P/'probe-result.json').write_text(json.dumps(R,indent=2)+'\n')
def run(*args,timeout=20,check=True):
 t=time.monotonic()
 try:
  q=sp.run([str(T),*args],env=E,capture_output=True,text=True,timeout=timeout)
  R['commands'].append({'argv':[str(T),*args],'rc':q.returncode,'seconds':round(time.monotonic()-t,3),'stdout':q.stdout,'stderr':q.stderr});save()
 except sp.TimeoutExpired:
  R['commands'].append({'argv':[str(T),*args],'timeout':timeout,'seconds':round(time.monotonic()-t,3)});save();raise
 if check and q.returncode:raise RuntimeError('owned VM command failed: '+str(args[:3])+' '+q.stderr[-1200:])
 return q

def case(name,action):
 t=time.monotonic();row={'name':name}
 try:row.update(status='PASS',result=action());print('PASS',name,flush=True)
 except Exception as e:row.update(status='FAIL',error=repr(e));raise
 finally:row['seconds']=round(time.monotonic()-t,3);R['cases'].append(row);save()

def interrupted(sig,frame):raise KeyboardInterrupt('stop owned VM controller')
signal.signal(signal.SIGTERM,interrupted)
try:
 R['hostProcessUid']=os.getuid();assert os.getuid()==501
 run('set',V,'--cpu','2','--memory','4096')
 R['vmConfiguration']=json.loads(run('get',V,'--format','json').stdout)
 argv=[str(T),'run',V,'--no-graphics','--no-audio','--no-clipboard','--no-usb-accessories','--net-host']
 R['runArgv']=argv;save()
 log=open(P/'tart-run.log','w');proc=sp.Popen(argv,env=E,stdout=log,stderr=sp.STDOUT)
 R['hostVmProcessPid']=proc.pid;save()
 def boot():
  end=time.monotonic()+180;last=None
  while time.monotonic()<end:
   if proc.poll() is not None:raise RuntimeError('VM process exited before native guest control: '+str(proc.returncode))
   try:
    q=run('exec',V,'/usr/bin/sw_vers',timeout=8,check=False)
    if q.returncode==0 and 'ProductVersion:' in q.stdout:return {'guestVersion':q.stdout,'hostProcessUid':os.getuid(),'noUserCommandRequired':True,'noHostAdminUsed':True}
    last=q.stderr[-400:]
   except sp.TimeoutExpired:last='guest agent not ready'
   time.sleep(3)
  raise RuntimeError('Native guest control timeout: '+str(last))
 case('native macOS VM boots and accepts agent-issued commands without user commands',boot)
 def identity():
  q=run('exec',V,'/bin/sh','-c','uname -sm; id; /usr/bin/sw_vers; /bin/hostname')
  assert 'Darwin arm64' in q.stdout,q.stdout
  return {'node':V,'nativeGuestIdentity':q.stdout,'physicalHostCount':1,'linuxDockerContainer':False}
 case('guest is actual Darwin arm64, not Linux container emulation',identity)
 def files():
  marker='VM_NATIVE_'+uuid.uuid4().hex
  run('exec',V,'/usr/bin/sudo','-n','-u','admin','/bin/sh','-c',f'umask 077; mkdir {guestProof}; printf "%s\\n" {marker} > {guestProof}/proof.txt')
  q=run('exec',V,'/bin/cat',guestProof+'/proof.txt');assert q.stdout==marker+'\n'
  return {'node':V,'guestExecutionAccount':'admin','path':guestProof+'/proof.txt','exactText':q.stdout,'separateGuestCommandRead':True,'hostDirectoryShare':False}
 case('separate native guest write and read operate on private VM disk',files)
 def mount_capability():
  q=run('exec',V,'/bin/sh','-c','test -x /sbin/mount_nfs && echo NATIVE_NFS_CLIENT_PRESENT; sudo -n /usr/bin/id -u')
  assert 'NATIVE_NFS_CLIENT_PRESENT\n0\n'==q.stdout,q.stdout
  return {'node':V,'output':q.stdout,'guestFixturePasswordlessSudo':True,'hostSudo':False,'notRealUserAuthorizationFlow':True,'noSharedMountYet':True}
 case('native guest NFS client and disposable guest admin capability available',mount_capability)
 R['uncovered']=['native Mac NFS sharing/semantics/failure/lifecycle','Mac application/native agents','complete single user setup command and normal OS approval flow','physical multi-computer LAN','production/source/UI/merge/user verification'];save()
except BaseException as e:
 R['fatal']=repr(e);save();print('CAPABILITY FAILURE',repr(e),flush=True)
finally:
 if proc and proc.poll() is None:
  try:
   q=run('exec',V,'/bin/rm','-rf',guestProof,timeout=15,check=False);R['cleanup'].append({'ownedGuestProofRemoved':q.returncode==0,'path':guestProof})
  except Exception as e:R['cleanup'].append({'guestProofCleanupError':repr(e)})
  try:q=run('stop',V,'--timeout','10',timeout=25,check=False);R['cleanup'].append({'exactVmStopRc':q.returncode})
  except Exception as e:R['cleanup'].append({'vmStopError':repr(e)})
  try:proc.wait(timeout=15)
  except sp.TimeoutExpired:
   proc.terminate()
   try:proc.wait(timeout=10)
   except sp.TimeoutExpired:proc.kill();proc.wait(timeout=10)
 if proc:R['cleanup'].append({'hostVmProcessExited':proc.poll() is not None,'exit':proc.returncode})
 if log:log.close()
 try:
  cfg=json.loads(run('get',V,'--format','json',check=False).stdout);R['stoppedVmConfiguration']=cfg
 except Exception as e:R['cleanup'].append({'configurationError':repr(e)})
 R['retainedResources']={'privateScratch':str(S),'exactVm':V,'reason':'Stopped credential-free task-owned VM/base image for subsequent approved filesystem experiments; no production mount or user node','deleteOwner':'Solution Designer exact owned scratch only; never global Tart/Docker prune'};save()
print(json.dumps({'run':V,'passes':sum(x['status']=='PASS' for x in R['cases']),'fatal':R.get('fatal'),'cleanup':R['cleanup']}),flush=True)
sys.exit(1 if R.get('fatal') else 0)
