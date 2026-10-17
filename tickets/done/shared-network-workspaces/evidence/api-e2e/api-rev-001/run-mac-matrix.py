"""V02 healthy current CLI matrix: two owned native macOS VMs, optional owned
Docker Desktop Linux kernel clients, restart and detach. Same physical host,
not Linux-native hosting, managed-node attachment, real models or release proof.
Uses existing public cached image, no host shares/credentials or user-node changes.
"""
from pathlib import Path
import subprocess as sp,json,time,os,hashlib,uuid,sys,ipaddress
R=Path.cwd();T=R/'tickets/in-progress/shared-network-workspaces';E=Path(__file__).resolve().parent
CACHE=Path('/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK');TART=str(CACHE/'tools/tart.app/Contents/MacOS/tart')
ENV={'PATH':os.environ['PATH'],'HOME':str(CACHE/'driver-home'),'TART_HOME':str(CACHE/'tart-state'),'TART_NO_AUTO_PRUNE':'1'}
# Explicit existing local daemon socket; no user's credential-bearing Docker config needed.
ENV['DOCKER_HOST']='unix:///Users/normy/.docker/run/docker.sock'
IMAGE='ghcr.io/cirruslabs/macos-tahoe-base@sha256:87f3aa5ce21b5c876268f233bdfecf38b4c2a8116fe9bbb718e714cbae187377'
APP='sha256:b1411fa6f5004dfe073d4841119a9c5da15c18ea93009fa20d6e312b25cd71d1'
ID='ab-nfs-api001-'+uuid.uuid4().hex[:8];A=ID+'-server';B=ID+'-client';SRC='/Users/admin/'+ID+'-source';ROOT='/Volumes/autobyteus-shared';BIN='/Users/admin/'+ID+'-binary'
report={'id':ID,'nodes':{'server':A,'nativeClient':B},'baseImage':IMAGE,'source':SRC,'mountRoot':ROOT,'binary':json.loads((E/'binary.json').read_text()),'commands':[],'cases':[],'cleanup':[],'scope':__doc__}
clones=[];processes={};logs=[];volumes=[];containers=[]
def save(): (E/'mac-matrix-result.json').write_text(json.dumps(report,indent=2)+'\n')
def event(state,msg):
 with (T/'api-e2e-test-case-ledger.md').open('a') as f:f.write('\n- '+time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())+' **V02 '+state+'** — '+msg+'\n')
def cmd(*args,timeout=45,check=True,input=None):
 start=time.monotonic()
 try:
  p=sp.run(args,env=ENV,capture_output=True,input=input,timeout=timeout)
  row={'argv':list(args),'rc':p.returncode,'seconds':round(time.monotonic()-start,3),'stdout':p.stdout.decode(errors='replace'),'stderr':p.stderr.decode(errors='replace')}
 except sp.TimeoutExpired as ex:
  row={'argv':list(args),'timedOut':timeout,'stdout':(ex.stdout or b'').decode(errors='replace'),'stderr':(ex.stderr or b'').decode(errors='replace')};report['commands'].append(row);save();raise
 report['commands'].append(row);save()
 if check and p.returncode:raise RuntimeError(row['stderr'][-2500:]+row['stdout'][-2500:])
 return row

def vt(*args,**kw):return cmd(TART,*args,**kw)
def guest(vm,code,**kw):return vt('exec',vm,'/usr/bin/sudo','-n','-u','admin','/bin/sh','-c',code,**kw)
def case(name,fn):
 row={'name':name};start=time.monotonic()
 try:row['evidence']=fn();row['status']='Pass';print('PASS',name,flush=True)
 except BaseException as ex:row['status']='Fail';row['error']=repr(ex);print('FAIL',name,repr(ex),flush=True);raise
 finally:row['seconds']=round(time.monotonic()-start,3);report['cases'].append(row);save();event('Checkpoint',name+': '+row['status'])
 return row.get('evidence')
def launch(vm,suffix='boot'):
 log=(E/(vm+'-'+suffix+'.log')).open('w');logs.append(log)
 p=sp.Popen([TART,'run',vm,'--no-graphics','--no-audio','--no-clipboard','--no-usb-accessories','--net-host'],env=ENV,stdout=log,stderr=sp.STDOUT);processes[vm]=p
 report.setdefault('processes',[]).append({'vm':vm,'pid':p.pid,'phase':suffix});save()
 for i in range(60):
  assert p.poll() is None,'VM exited during boot'
  try:
   q=vt('exec',vm,'/usr/bin/sw_vers',timeout=5,check=False)
   if q['rc']==0:return
  except sp.TimeoutExpired:pass
  time.sleep(2)
 raise RuntimeError('VM command control unavailable')
def cli(vm,args,timeout=120):return guest(vm,'umask 077; exec '+BIN+' '+args,timeout=timeout)
def status(vm):
 q=cli(vm,'status --yes --json');j=json.loads(q['stdout']);assert j['hostReady'] is True,j
 assert j['storageId']==connection['storageId'],j
 return j
try:
 event('Started','Two fresh owned Mac VMs, unchanged development CLI, no user resources; '+ID)
 for vm in [A,B]:
  vt('clone',IMAGE,vm,timeout=120);clones.append(vm);vt('set',vm,'--cpu','2','--memory','4096');launch(vm)
  binary=Path(report['binary']['path']).read_bytes();assert hashlib.sha256(binary).hexdigest()==report['binary']['sha256']
  vt('exec','-i',vm,'/usr/bin/sudo','-n','-u','admin','/bin/sh','-c','umask 077; cat > '+BIN+'; chmod 755 '+BIN,input=binary)
  q=guest(vm,'shasum -a 256 '+BIN+'; '+BIN+' version; id; /usr/bin/stat -f "%u:%g %Lp %N" /Library /Volumes');assert report['binary']['sha256'] in q['stdout']
 ips={vm:guest(vm,'/usr/sbin/ipconfig getifaddr en0')['stdout'].strip() for vm in [A,B]};report['ips']=ips;assert ips[A]!=ips[B]
 route=cmd('/sbin/route','-n','get',ips[A])['stdout'];interface=[l.split(':',1)[1].strip() for l in route.splitlines() if l.strip().startswith('interface:')][0];assert interface.startswith('bridge')
 addresses=cmd('/sbin/ifconfig',interface)['stdout'];candidates=[]
 for line in addresses.splitlines():
  v=line.split()
  if v and v[0]=='inet' and 'netmask' in v:
   mask=v[v.index('netmask')+1];mask=str(ipaddress.IPv4Address(int(mask,16))) if mask.startswith('0x') else mask
   if ipaddress.ip_address(ips[A]) in ipaddress.ip_network(v[1]+'/'+mask,strict=False):candidates.append(v[1])
 assert len(candidates)==1;gateway=candidates[0];report['hostOnlyGateway']=gateway;save()
 guest(A,'set -e; test ! -e '+SRC+'; test ! -e '+ROOT+'; test ! -e /etc/exports; mkdir -m 755 '+SRC+'; mkdir -m 755 '+SRC+'/project; printf ORIGINAL_API001 > '+SRC+'/project/preexisting.txt')
 q=case('storage create on original nonempty APFS source',lambda:cli(A,'create --source '+SRC+' --endpoint '+ips[A]+' --allow '+','.join([ips[A],ips[B],gateway])+' --nodes none --yes --json',180))
 payload=json.loads(q['stdout']);assert payload['status']['hostReady'];connection=payload['connection'];report['connection']=connection;save()
 import shlex
 q=case('second native Mac connects through product command',lambda:cli(B,'connect --connection '+shlex.quote(json.dumps(connection))+' --nodes none --yes --json',180));assert json.loads(q['stdout'])['status']['hostReady']
 def native_ops():
  code="""import os,pathlib,hashlib,json
p=pathlib.Path('/Volumes/autobyteus-shared/project');assert (p/'preexisting.txt').read_text()=='ORIGINAL_API001'
(p/'nested').mkdir();f=open(p/'nested'/'fresh.bin','wb');f.write(bytes(range(256))*4096);f.flush();os.fsync(f.fileno());f.close()
(p/'script.sh').write_text('#!/bin/sh\\nprintf NATIVE_EXEC');(p/'script.sh').chmod(0o755);os.symlink('nested/fresh.bin',p/'relative.bin')
fd=os.open(p/'exclusive',os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600);os.close(fd)
try:os.open(p/'exclusive',os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600);raise AssertionError('exclusive failed')
except FileExistsError:pass
os.rename(p/'exclusive',p/'renamed');print(json.dumps({'sha256':hashlib.sha256((p/'relative.bin').read_bytes()).hexdigest(),'uid':(p/'nested'/'fresh.bin').stat().st_uid,'gid':(p/'nested'/'fresh.bin').stat().st_gid}))
"""
  out=guest(A,'/usr/bin/python3 -c '+shlex.quote(code));expected=hashlib.sha256(bytes(range(256))*4096).hexdigest();assert expected in out['stdout']
  start=time.monotonic();out2=guest(B,'set -e; test "$(shasum -a 256 '+ROOT+'/project/relative.bin | cut -d " " -f1)" = '+expected+'; test "$('+ROOT+'/project/script.sh)" = NATIVE_EXEC; printf PEER_API001 >> '+ROOT+'/project/preexisting.txt; /bin/rm '+ROOT+'/project/renamed; /usr/bin/stat -f "%u:%g %Lp" '+ROOT+'/project/nested/fresh.bin');elapsed=time.monotonic()-start;assert elapsed<5
  out3=guest(A,'cat '+SRC+'/project/preexisting.txt; test ! -e '+ROOT+'/project/renamed');assert out3['stdout']=='ORIGINAL_API001PEER_API001'
  return {'first':out,'peer':out2,'origin':out3,'freshOpenSeconds':elapsed,'bytes':1048576,'kernelMounts':[guest(v,'/sbin/mount; /usr/sbin/nfsstat -m') for v in [A,B]]}
 case('native reciprocal ordinary operations and synced 1MiB fresh open',native_ops)
 def docker_clients():
  cmd('docker','image','inspect',APP,'--format','{{.Id}} {{.Os}} {{.Architecture}}')
  for index,uid in [(0,'0:0'),(1,'10001:10001')]:
   volume=ID+'-vol'+str(index);name=ID+'-docker'+str(index)
   cmd('docker','volume','create','--driver','local','--label','org.autobyteus.validation='+ID,'--opt','type=nfs','--opt','o=addr='+ips[A]+',rw,vers=3,tcp,hard,nolock,mountport=20048,actimeo=1','--opt','device=:'+SRC,volume);volumes.append(volume)
   code="const fs=require('fs'); const p='/Volumes/autobyteus-shared/project'; if(fs.readFileSync(p+'/preexisting.txt','utf8')!=='ORIGINAL_API001PEER_API001')throw Error('source');fs.writeFileSync(p+'/docker"+str(index)+".txt','DOCKER"+str(index)+"');const s=fs.statSync(p+'/docker"+str(index)+".txt');if(s.uid!==501||s.gid!==20)throw Error('not mapped nonroot '+s.uid+':'+s.gid);console.log(JSON.stringify({uid:s.uid,gid:s.gid,processUid:process.getuid()}));"
   containers.append(name)
   q=cmd('docker','run','--name',name,'--label','org.autobyteus.validation='+ID,'--user',uid,'--entrypoint','node','--mount','type=volume,source='+volume+',target='+ROOT+',volume-nocopy',APP,'-e',code,timeout=90)
   report.setdefault('dockerProof',[]).append(q);save()
  out=guest(B,'cat '+ROOT+'/project/docker0.txt '+ROOT+'/project/docker1.txt');assert out['stdout']=='DOCKER0DOCKER1'
  return {'sourceOnServer':guest(A,'cat '+SRC+'/project/docker0.txt '+SRC+'/project/docker1.txt'),'scope':'Kernel clients only, not selected managed-node recreation or app/native-model integration'}
 case('two real Docker Desktop NFS clients root and nonroot map to source501',docker_clients)
 case('healthy status and explicit reconnect sameUUID both Macs',lambda:[status(A),json.loads(cli(B,'reconnect --yes --json')['stdout']),status(B)])
 # Retire Docker clients/volumes before any server stop: no hard-mounted host state remains.
 for c in list(containers):cmd('docker','rm',c);containers.remove(c)
 for v in list(volumes):cmd('docker','volume','rm',v);volumes.remove(v)
 def restart_client():
  before=guest(B,'/usr/sbin/sysctl -n kern.boottime')['stdout'];vt('stop',B,'--timeout','20',timeout=45);processes[B].wait(timeout=20);launch(B,'restart')
  after=guest(B,'/usr/sbin/sysctl -n kern.boottime')['stdout'];assert before!=after,(before,after)
  # Wait normal launchd startup; don't invoke reconnect to fake automatic recovery.
  attempts=[]
  for i in range(30):
   q=cli(B,'status --yes --json',60) if i==29 else guest(B,BIN+' status --yes --json',timeout=60,check=False)
   attempts.append(q)
   if q['rc']==0:
    j=json.loads(q['stdout'])
    if j['hostReady']:assert j['storageId']==connection['storageId'];break
   time.sleep(2)
  else:raise AssertionError('automatic mount not ready')
  content=guest(B,'cat '+ROOT+'/project/preexisting.txt')['stdout'];assert content=='ORIGINAL_API001PEER_API001'
  return {'before':before,'after':after,'statusAttempts':attempts,'preservedContent':content}
 case('actual native client reboot auto-remount without manual reconnect',restart_client)
 def detach():
  results=[]
  for vm in [B,A]:results.append(cli(vm,'detach --yes --drained',180));results.append(guest(vm,'set -e; ! /sbin/mount | grep " on '+ROOT+' "; test ! -e /etc/autobyteus-nfs/attachment.json'))
  source=guest(A,'cat '+SRC+'/project/preexisting.txt; cat '+SRC+'/.autobyteus-nfs/storage.json; /usr/bin/stat -f "%u:%g %Lp" '+SRC)
  assert 'ORIGINAL_API001PEER_API001' in source['stdout'] and connection['storageId'] in source['stdout']
  return {'detach':results,'preservedSource':source}
 case('product detach drains owned clients and preserves original source/marker',detach)
 report['result']='Pass';save();event('Completed','Pass at virtual two-native-Mac + two Docker-kernel-client scope; not physical/managed-node/runtime/whole mode matrix.')
except BaseException as ex:
 report['result']='Fail';report['fatal']=repr(ex);save();event('Completed','Fail/incomplete: '+repr(ex))
 for vm,p in processes.items():
  if p.poll() is None:
   try:report.setdefault('diagnostics',[]).append(guest(vm,'/sbin/mount; sudo -n /bin/launchctl print system/com.autobyteus.nfs; sudo -n /bin/cat /Library/\'Application Support\'/AutoByteusNFS/service.log; sudo -n /bin/ls -la /Library/\'Application Support\'/AutoByteusNFS; sudo -n /usr/bin/pgrep -lf autobyteus-nfs',check=False))
   except Exception as dx:report.setdefault('diagnostics',[]).append({'error':repr(dx)})
 save()
finally:
 for c in containers:
  try:report['cleanup'].append(cmd('docker','rm','-f','-v',c,check=False,timeout=45))
  except Exception as ex:report['cleanup'].append({'container':c,'error':repr(ex)})
 for v in volumes:
  try:report['cleanup'].append(cmd('docker','volume','rm',v,check=False,timeout=45))
  except Exception as ex:report['cleanup'].append({'volume':v,'error':repr(ex)})
 for vm in reversed(clones):
  p=processes.get(vm)
  if p and p.poll() is None:
   try:report['cleanup'].append(vt('stop',vm,'--timeout','15',timeout=35,check=False));p.wait(timeout=20)
   except Exception:
    p.terminate()
    try:p.wait(timeout=15)
    except sp.TimeoutExpired:p.kill();p.wait(timeout=10)
  report['cleanup'].append({'vm':vm,'processExited':not p or p.poll() is not None})
  report['cleanup'].append(vt('delete',vm,timeout=60,check=False))
 for log in logs:log.close()
 listing=vt('list');report['cleanup'].append({'clonesAbsent':all(v not in listing['stdout'] for v in clones),'cacheRetained':IMAGE in listing['stdout']});save();event('Checkpoint','Exact resource cleanup receipt saved.')
print(json.dumps({'result':report.get('result'),'fatal':report.get('fatal'),'id':ID}),flush=True)
