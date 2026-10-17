"""Disposable storage component experiments, NOT product code/final validation.
Local Mac Docker Desktop only; same-host Linux containers are not separate computers.
Owns named containers/network/volumes; no user AutoByteus containers or volumes.
"""
from pathlib import Path
import subprocess as sp, json, time, uuid, socket, os, tempfile, sys
P=Path(__file__).resolve().parent
S='ab-sf-fr002-'+uuid.uuid4().hex[:8]
I='autobyteus-shared-feasibility:fr-001'
R={'run':S,'evidence_scope':'same-Mac Docker Desktop Linux component probes; native Mac attempted separately','commands':[],'cases':[],'cleanup':[]}
containers=[];volumes=[];network=None;macdir=None;server=None
M='/Volumes/autobyteus-shared'
def save(): (P/'probe-result.json').write_text(json.dumps(R,indent=2))
def run(*args, timeout=40, check=True):
 t=time.monotonic()
 try:
  q=sp.run(args,text=True,capture_output=True,timeout=timeout)
  row={'argv':list(args),'rc':q.returncode,'seconds':round(time.monotonic()-t,3),'stdout':q.stdout,'stderr':q.stderr}
 except sp.TimeoutExpired as e:
  row={'argv':list(args),'timeout':timeout,'seconds':round(time.monotonic()-t,3),'stdout':str(e.stdout),'stderr':str(e.stderr)}
  R['commands'].append(row);save();raise
 R['commands'].append(row);save()
 if check and q.returncode: raise RuntimeError(f'{args[0:3]}: rc={q.returncode}: {q.stderr[-1400:]}')
 return q

def d(*a,**kw): return run('docker',*a,**kw)
def py(n,code,timeout=35):return d('exec',n,'python3','-c',code,timeout=timeout).stdout.strip()
def case(name,action):
 t=time.monotonic();row={'name':name}
 try: row['result']=action();row['status']='PASS';print('PASS',name,flush=True)
 except Exception as e: row['status']='FAIL';row['error']=repr(e);print('FAIL',name,repr(e),flush=True);raise
 finally:row['seconds']=round(time.monotonic()-t,3);R['cases'].append(row);save()

def cstart(name,*args):
 containers.append(name);return d('run','-d','--name',name,'--label','org.autobyteus.task=shared-network-workspaces','--label','org.autobyteus.probe=fr-002',*args,I).stdout.strip()
def ismacmounted():
 return bool(macdir) and any((' on '+macdir+' (') in line for line in sp.check_output(['mount'],text=True).splitlines())
try:
 network=S+'-net';d('network','create','--label','org.autobyteus.probe=fr-002',network)
 net=json.loads(d('network','inspect',network).stdout)[0]['IPAM']['Config'][0]
 subnet=net['Subnet'];R['network']=net
 data=S+'-data';volumes.append(data);d('volume','create','--label','org.autobyteus.probe=fr-002',data)
 config=P/'ganesha.conf'
 pseudo='/'+S
 config.write_text(f'''NFS_CORE_PARAM {{ Protocols = 4; Enable_NLM = false; Enable_UDP = false; mount_path_pseudo = true; }}
NFSv4 {{ Grace_Period = 5; Lease_Lifetime = 5; }}
EXPORT {{ Export_Id = 17; Path = /export; Pseudo = {pseudo}; Protocols = 4; Transports = TCP; SecType = sys;
 Access_Type = None; Squash = All_Squash; Anonymous_UID = 10001; Anonymous_GID = 10001;
 CLIENT {{ Clients = {subnet}; Access_Type = RW; }} FSAL {{ Name = VFS; }} }}
LOG {{ Components {{ ALL = EVENT; }} }}
''')
 sock=socket.socket();sock.bind(('127.0.0.1',0));port=sock.getsockname()[1];sock.close();R['loopback_port']=port
 server=S+'-server'
 cstart(server,'--network',network,'--cap-add','DAC_READ_SEARCH','-p',f'127.0.0.1:{port}:2049',
  '--mount',f'type=volume,src={data},dst=/export','--mount',f'type=bind,src={config},dst=/etc/ganesha/ganesha.conf,readonly')
 d('exec',server,'sh','-c','chown 10001:10001 /export; chmod 0770 /export; mkdir -p /run/ganesha /var/lib/nfs/ganesha /run/dbus; rpcbind -w; dbus-daemon --system --fork; ganesha.nfsd -F -L /tmp/ganesha.log -f /etc/ganesha/ganesha.conf >/tmp/ganesha-console.log 2>&1 &')
 time.sleep(7)
 R['server_log']=d('exec',server,'cat','/tmp/ganesha.log',check=False).stdout;save()
 ip=json.loads(d('inspect',server).stdout)[0]['NetworkSettings']['Networks'][network]['IPAddress'];R['server_ip']=ip
 d('exec',server,'pgrep','ganesha.nfsd')
 clients=[]
 for ix in ['a','b']:
  v=S+'-nfs-'+ix;volumes.append(v)
  d('volume','create','--label','org.autobyteus.probe=fr-002','--driver','local','--opt','type=nfs','--opt',f'device=:{pseudo}',
    '--opt',f'o=addr={ip},rw,nfsvers=4.1,proto=tcp,hard,timeo=50,retrans=2,actimeo=1,nosharecache',v)
  n=S+'-'+ix;cstart(n,'--network',network,'--user','10001:10001','--mount',f'type=volume,src={v},dst={M},volume-nocopy');clients.append(n)
 a,b=clients
 case('Docker-managed NFS volume, no mount command or elevated client capabilities inside node',lambda: {
  'a':d('exec',a,'sh','-c',f'grep " {M} " /proc/mounts; id; grep CapEff /proc/self/status').stdout,
  'b':d('exec',b,'sh','-c',f'grep " {M} " /proc/mounts; id; grep CapEff /proc/self/status').stdout})
 case('completed write A -> read/modify B -> read A',lambda: {
  'write':py(a,f"import pathlib,os; p=pathlib.Path('{M}/roundtrip.txt'); f=p.open('w'); f.write('from-a'); f.flush(); os.fsync(f.fileno()); f.close(); print('from-a')"),
  'b':py(b,f"from pathlib import Path; p=Path('{M}/roundtrip.txt'); assert p.read_text()=='from-a'; p.write_text('from-b'); print(p.read_text())"),
  'a':py(a,f"from pathlib import Path; p=Path('{M}/roundtrip.txt'); assert p.read_text()=='from-b'; print(p.read_text())")})
 case('1MiB binary exact cross-client content',lambda:{
  'write':py(a,f"from pathlib import Path; import hashlib; z=bytes(range(256))*4096; Path('{M}/data.bin').write_bytes(z); print(hashlib.sha256(z).hexdigest())"),
  'read':py(b,f"from pathlib import Path; import hashlib; z=Path('{M}/data.bin').read_bytes(); assert z==bytes(range(256))*4096; print(hashlib.sha256(z).hexdigest())")})
 case('mkdir, atomic replace, relative symlink, exclusive-create, executable mode',lambda:{
  'a':py(a,f"from pathlib import Path; import os; p=Path('{M}/ops'); p.mkdir(); (p/'draft').write_text('complete'); os.replace(p/'draft',p/'final'); (p/'link').symlink_to('final'); f=os.open(p/'exclusive',os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o660); os.close(f); (p/'run.sh').write_text('#!/bin/sh\\necho shared-exec\\n'); (p/'run.sh').chmod(0o770); print('published')"),
  'b':py(b,f"from pathlib import Path; import os,subprocess; p=Path('{M}/ops'); assert (p/'final').read_text()=='complete'; assert (p/'link').read_text()=='complete'; assert subprocess.check_output([str(p/'run.sh')],text=True).strip()=='shared-exec';\ntry: os.open(p/'exclusive',os.O_CREAT|os.O_EXCL|os.O_WRONLY)\nexcept FileExistsError: print('exclusive-create denied, symlink and exec OK')\nelse: raise AssertionError('exclusive create should fail')")})
 # Native Linux OS-client mounting is intentionally a distinct component probe.
 c=S+'-native';cstart(c,'--network',network,'--cap-add','SYS_ADMIN')
 case('ordinary Linux OS NFS client',lambda:{
  'mount':d('exec',c,'sh','-c',f'mkdir -p {M}; mount -t nfs -o vers=4.1,proto=tcp,hard,actimeo=1,nosharecache {ip}:{pseudo} {M}; grep " {M} " /proc/mounts').stdout,
  'roundtrip':py(c,f"from pathlib import Path; p=Path('{M}/roundtrip.txt'); assert p.read_text()=='from-b'; p.write_text('from-native-linux'); print(p.read_text())"),
  'a':py(a,f"from pathlib import Path; assert Path('{M}/roundtrip.txt').read_text()=='from-native-linux'; print('observed native Linux modification')")})
 # Mac native mounted folder attempt. No UI, no password handling, exact owned target.
 macdir=tempfile.mkdtemp(prefix=S+'-mac-',dir='/private/tmp');R['mac_mountpoint']=macdir
 url=f'nfs://127.0.0.1{pseudo}?options=vers:4?options=port:{port}?options=tcp?options=retrycnt:0'
 mac=run('/private/tmp/ab-shared-netfs-fr001',url,macdir,timeout=35,check=False)
 R['mac_mount_attempt']={'rc':mac.returncode,'stdout':mac.stdout,'stderr':mac.stderr,'mounted':ismacmounted()};save()
 if ismacmounted():
  case('Mac ordinary native filesystem -> Docker reciprocal access',lambda:{
   'read':Path(macdir,'roundtrip.txt').read_text(),
   'write':Path(macdir,'mac.txt').write_text('native-mac'),
   'docker':py(b,f"from pathlib import Path; p=Path('{M}/mac.txt'); assert p.read_text()=='native-mac'; p.write_text('from-container'); print(p.read_text())"),
   'mac':Path(macdir,'mac.txt').read_text()})
 else:
  R['cases'].append({'name':'Mac ordinary native mounted-folder proof','status':'BLOCKED','reason':'Native NoUI mount did not succeed; no cached sudo/admin capability; not replaced with API-only reads.'});save()
 # POSIX flock against a distinct native Linux client mount.
 lockcode=f"import fcntl,time; f=open('{M}/lock','w'); fcntl.flock(f,fcntl.LOCK_EX); print('LOCKED',flush=True); time.sleep(5)"
 holder=sp.Popen(['docker','exec',a,'python3','-c',lockcode],stdout=sp.PIPE,stderr=sp.PIPE,text=True)
 assert holder.stdout.readline().strip()=='LOCKED'
 try:
  case('cross-client advisory flock exclusion',lambda:py(c,f"import fcntl,errno; f=open('{M}/lock','r+');\ntry: fcntl.flock(f,fcntl.LOCK_EX|fcntl.LOCK_NB)\nexcept BlockingIOError: print('excluded')\nelse: raise AssertionError('lock not excluded')"))
 finally:holder.communicate(timeout=15)
 case('lock released after writer exits',lambda:py(c,f"import fcntl; f=open('{M}/lock','r+'); fcntl.flock(f,fcntl.LOCK_EX|fcntl.LOCK_NB); print('acquired')"))
 case('sequential Git working-copy operations across clients',lambda:{
  'init':d('exec',a,'sh','-c',f'mkdir {M}/repo; cd {M}/repo; git init -q; echo initial > tracked.txt; git add tracked.txt; git -c user.name=Probe -c user.email=probe@example.invalid commit -qm initial').stdout,
  'b':d('exec',b,'sh','-c',f'cd {M}/repo; git status --porcelain; echo updated > tracked.txt; git add tracked.txt; git -c user.name=Probe -c user.email=probe@example.invalid commit -qm updated; git log -1 --format=%s').stdout,
  'native':d('exec',c,'sh','-c',f'git -c safe.directory={M}/repo -C {M}/repo log -1 --format=%s; cat {M}/repo/tracked.txt').stdout})
 # Loss should stall native hard-mounted IO, not succeed in a hidden local folder.
 def outage():
  d('pause',server)
  worker=None;stalled=False
  try:
   code=f"import os; f=os.open('{M}/outage-'+str(os.getpid()),os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o660); os.write(f,b'after-recovery'); os.fsync(f); os.close(f); print('committed')"
   worker=sp.Popen(['docker','exec',b,'python3','-c',code],text=True,stdout=sp.PIPE,stderr=sp.PIPE)
   try:worker.communicate(timeout=2)
   except sp.TimeoutExpired:stalled=True
  finally:d('unpause',server)
  out,err=worker.communicate(timeout=25)
  assert stalled and worker.returncode==0,(stalled,out,err)
  return {'stalled_during_pause':stalled,'resumed_stdout':out,'scope':'backend IO only; AutoByteus readiness timeout not implemented/proved'}
 case('storage interruption stalls IO then recovers without local substitute',outage)
 save()
except Exception as e:
 R['fatal']=repr(e);print('PROBE FAILURE:',repr(e),flush=True);save()
finally:
 if server:
  d('unpause',server,check=False)
  R['server_log_final']=d('exec',server,'cat','/tmp/ganesha.log',check=False).stdout;save()
 if ismacmounted():
  u=run('umount',macdir,check=False,timeout=15);R['cleanup'].append({'mac_unmount_rc':u.returncode})
  if ismacmounted():
   u=run('diskutil','unmount',macdir,check=False,timeout=20);R['cleanup'].append({'diskutil_unmount_rc':u.returncode})
 if ismacmounted():
  R['cleanup'].append({'status':'BLOCKED','reason':'owned Mac mount remains; retain owned server until safely detached'});save()
 else:
  for n in reversed(containers):
   q=d('rm','-f',n,check=False);R['cleanup'].append({'container':n,'rc':q.returncode})
  for v in reversed(volumes):
   q=d('volume','rm',v,check=False);R['cleanup'].append({'volume':v,'rc':q.returncode})
  if network:
   q=d('network','rm',network,check=False);R['cleanup'].append({'network':network,'rc':q.returncode})
  if macdir and Path(macdir).exists():os.rmdir(macdir)
 save()
print(json.dumps({'run':S,'cases':R['cases'],'fatal':R.get('fatal'),'cleanup':R['cleanup']},indent=2),flush=True)
