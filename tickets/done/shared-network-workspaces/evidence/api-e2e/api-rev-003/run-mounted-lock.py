from pathlib import Path
import json,subprocess as sp,time,shlex,hashlib,select
E=Path(__file__).resolve().parent;p=E/'run-linux-docker-public.py';s=p.read_text().split('try:\n case(')[0].replace('linux-docker-public-result.json','mounted-lock-result.json');exec(s)
held=None
try:
 path=ROOT+'/api-scenario/api003-lock.txt';code="import fcntl,sys; f=open("+repr(path)+",'w+'); fcntl.lockf(f,fcntl.LOCK_EX); print('LOCK_HELD',flush=True); sys.stdin.readline(); fcntl.lockf(f,fcntl.LOCK_UN); f.close(); print('LOCK_RELEASED',flush=True)"
 argv=[tart,'exec','-i',V,'sudo','-n','/usr/bin/setpriv','--reuid=1000','--regid=109','--clear-groups','python3','-u','-c',code];err=(E/'mounted-lock-holder.log').open('w');held=sp.Popen(argv,env=env,stdin=sp.PIPE,stdout=sp.PIPE,stderr=err);r['holder']={'pid':held.pid,'argv':argv};save();ready=select.select([held.stdout],[],[],15)[0];assert ready,'holder not ready';line=held.stdout.readline().decode();assert line=='LOCK_HELD\n',line;r['holder']['ready']=line;save()
 blocked="import fcntl,json; f=open("+repr(path)+",'r+');\ntry: fcntl.lockf(f,fcntl.LOCK_EX|fcntl.LOCK_NB)\nexcept BlockingIOError: print(json.dumps({'otherClientLock':'blocked as expected'}))\nelse: raise AssertionError('container obtained conflicting POSIX lock')\nfinally: f.close()"
 q=case('native host NFS lock excludes managedDocker NFS volume client',lambda:g('sudo -n docker exec autobyteus-server-0 python3 -c '+shlex.quote(blocked)));assert 'blocked as expected' in q['stdout']
 held.stdin.write(b'release\n');held.stdin.flush();held.stdin.close();assert held.wait(timeout=15)==0;r['holder']['released']=held.stdout.read().decode();assert r['holder']['released']=='LOCK_RELEASED\n';save()
 acquire="import fcntl,json,os; f=open("+repr(path)+",'r+'); fcntl.lockf(f,fcntl.LOCK_EX|fcntl.LOCK_NB); f.write('API003_LOCKED_WRITE'); f.flush(); os.fsync(f.fileno()); fcntl.lockf(f,fcntl.LOCK_UN); f.close(); print(json.dumps({'afterRelease':'acquired and wrote'}))"
 case('managedDocker client acquires same lock after ordinary host release',lambda:g('sudo -n docker exec autobyteus-server-0 python3 -c '+shlex.quote(acquire)))
 q=nongroups('cat '+SRC+'/api-scenario/api003-lock.txt');assert q['stdout']=='API003_LOCKED_WRITE';r['result']='Pass';save();event('Real native-host and Docker-volume NFS mount clients serialize POSIX record locks; same kernel/VM, not independent physical peer certification')
except BaseException as x:r['result']='Fail';r['fatal']=repr(x);save();event('Mounted lock Fail/incomplete '+repr(x))
finally:
 if held and held.poll() is None:
  try:held.stdin.write(b'release\n');held.stdin.flush();held.wait(timeout=10)
  except BaseException:held.terminate();held.wait(timeout=10)
 if held:r['holder']['finalExitCode']=held.poll();save()
print(json.dumps({'result':r['result'],'fatal':r.get('fatal')}),flush=True)
