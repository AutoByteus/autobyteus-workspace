"""Designer-owned bounded UNFS3 alternative for the measured Mac-bind limitation.
Pinned third-party release; ordinary host source and two daemon-owned NFSv3
client volumes. No providers/user mounts/nodes, product CLI or NLM claim.
"""
from pathlib import Path
import json,subprocess as sp,uuid,tempfile,time,os,shutil,socket,sys,threading
P=Path(__file__).resolve().parent;S='ab-sf-fr042-'+uuid.uuid4().hex[:8];M='/Volumes/autobyteus-shared';ROOT=M+'/project';APP='sha256:b1411fa6f5004dfe073d4841119a9c5da15c18ea93009fa20d6e312b25cd71d1';scratch=Path(tempfile.mkdtemp(prefix='ab-sf-fr042-owned-'));source=scratch/'source';config=scratch/'config';source.mkdir();config.mkdir();(source/'project').mkdir();(source/'project/preexisting.txt').write_text('KEEP_MAC_BIND_SOURCE');storage=uuid.uuid4().hex;(source/'storage.json').write_text(json.dumps({'storageId':storage}));containers=[];volumes=[]
R={'run':S,'scope':'UNFS3 Linux Docker server directly serves selected Mac host scratch bind; two UID10001 Docker NFSv3 clients; one physical Mac only; no agents/NLM/final product proof','engineCommit':'ec1660ba33c80d5c67131e163e68834c1a10e243','source':str(source),'mount':M,'commands':[],'cases':[],'cleanup':[]}
def save():(P/'probe-result.json').write_text(json.dumps(R,indent=2))
def d(*args,check=True,timeout=45):
 a=['docker',*args];z=sp.run(a,capture_output=True,text=True,timeout=timeout);R['commands'].append({'argv':a,'rc':z.returncode,'stdout':z.stdout,'stderr':z.stderr});save()
 if check and z.returncode:raise RuntimeError(z.stderr[-1800:])
 return z

def case(name,fn):
 row={'name':name};start=time.monotonic()
 try:row.update(status='PASS',result=fn());print('PASS',name,flush=True)
 except Exception as e:row.update(status='FAIL',error=repr(e));raise
 finally:row['seconds']=round(time.monotonic()-start,3);R['cases'].append(row);save()
def node(name,code):return d('exec',name,'node','-e',code).stdout.strip()
try:
 exec((P/'vm-client.py').read_text(),globals());vm_boot()
 gateway=d('network','inspect','bridge','--format','{{(index .IPAM.Config 0).Gateway}}').stdout.strip()
 (config/'exports').write_text('/export '+gateway+'(rw,all_squash,anonuid=10001,anongid=10001,insecure)\n')
 server=S+'-server';containers.append(server)
 image=d('image','inspect','ab-sf-fr040-unfs:probe','--format','{{.Id}}').stdout.strip();R['engineImage']=image
 d('run','-d','--name',server,'--label','org.autobyteus.probe=fr-042','--user','10001:10001','-p','127.0.0.1::2049','--mount','type=bind,src='+str(source)+',dst=/export','--mount','type=bind,src='+str(config)+',dst=/config,readonly',image,'-d','-s','-p','-t','-n','2049','-m','2049','-e','/config/exports')
 ip=d('inspect',server,'--format','{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}').stdout.strip();storage_port=int(d('port',server,'2049/tcp').stdout.strip().rsplit(':',1)[1]);R['server']={'node':server,'ip':ip,'uid':10001,'privateLoopbackPublication':d('port',server,'2049/tcp').stdout.strip(),'source':str(source),'containerSource':'/export','clientAllowlist':[gateway],'notEncrypted':True};save()
 def server_check():
  r=node(server,"const f=require('fs');console.log(JSON.stringify({uid:process.getuid(),source:f.readFileSync('/export/project/preexisting.txt','utf8'),owner:f.statSync('/export').uid}))");v=json.loads(r);assert v['uid']==10001 and v['source']=='KEEP_MAC_BIND_SOURCE';return {**R['server'],**v}
 case('pinned UNFS3 starts nonroot and directly reads chosen Mac host source without Linux file handles',server_check)
 clients=[]
 def mount():
  for suffix in ['a','b']:
   v=S+'-nfs-'+suffix;volumes.append(v);options='addr='+ip+',vers=3,proto=tcp,mountproto=tcp,mountvers=3,port=2049,mountport=2049,nolock,hard,timeo=50,retrans=2,actimeo=1,nosharecache';d('volume','create','--label','org.autobyteus.probe=fr-042','--driver','local','--opt','type=nfs','--opt','device=:/export','--opt','o='+options,v);n=S+'-client-'+suffix;containers.append(n);clients.append(n);d('run','-d','--name',n,'--label','org.autobyteus.probe=fr-042','--user','10001:10001','--entrypoint','tail','--mount','type=volume,src='+v+',dst='+M+',volume-nocopy',APP,'-f','/dev/null',timeout=60);identity=json.loads(node(n,"console.log(JSON.stringify(JSON.parse(require('fs').readFileSync("+json.dumps(M+'/storage.json')+",'utf8'))))"));assert identity['storageId']==storage
  R['clientNodes']=clients;return {'nodes':clients,'sameStorageId':storage,'mount':M,'project':ROOT,'nolockExplicit':True}
 case('two independent Linux daemon mounts share same Mac-bound storage identity at agreed path',mount)
 def native_mount():
  global vm_created_mount
  start_relay()
  vmsh('test ! -e '+M+'; sudo -n /bin/mkdir '+M)
  vmsh('sudo -n /sbin/mount -t nfs -o vers=3,tcp,hard,actimeo=1,locallocks,resvport,retrycnt=0,port='+str(relay_port)+',mountport='+str(relay_port)+' '+vm_gateway+':/export '+M,timeout=30);vm_created_mount=True
  v=json.loads(vmsh('cat '+M+'/storage.json').stdout);assert v['storageId']==storage
  return {'node':VM,'mount':M,'project':ROOT,'sameStorageId':storage,'localLocksOnly':True,'testOnlyRawTCPRelay':True,'noHostMountOrShare':True}
 case('native Mac kernel client mounts same Mac-bound UNFS3 folder at identical path',native_mount)

 a,b=clients;x='HOST_SOURCE_'+uuid.uuid4().hex+'\n';y='CLIENT_B_'+uuid.uuid4().hex+'\n';file='roundtrip.txt'
 def exact(expected):
  start=time.monotonic()
  while time.monotonic()-start<5:
   vals=[json.loads(node(n,"console.log(JSON.stringify(require('fs').readFileSync("+json.dumps(ROOT+'/'+file)+",'utf8')))")) for n in clients]+[(source/'project'/file).read_text(),vmsh('/bin/cat '+ROOT+'/'+file).stdout]
   if all(v==expected for v in vals):return {'allExact':True,'seconds':round(time.monotonic()-start,3),'nodes':clients,'hostSource':str(source/'project'/file)}
   time.sleep(.15)
  raise AssertionError(vals)
 def host_write():
  with (source/'project'/file).open('w') as f:f.write(x);f.flush();os.fsync(f.fileno())
  return exact(x)
 case('ordinary Mac host-folder write is exact in both Linux NFS clients within five seconds',host_write)
 def modify():
  node(b,"const f=require('fs');let q=f.openSync("+json.dumps(ROOT+'/'+file)+",'a');f.writeSync(q,"+json.dumps(y)+");f.fsyncSync(q);f.closeSync(q)");return exact(x+y)
 case('Linux mounted append reaches original Mac source and peer without copying',modify)
 def ops():
  node(a,"const f=require('fs'),p="+json.dumps(ROOT)+";f.mkdirSync(p+'/dir');f.writeFileSync(p+'/dir/temp','RENAMED');f.renameSync(p+'/dir/temp',p+'/renamed');f.symlinkSync('roundtrip.txt',p+'/link');f.writeFileSync(p+'/exclusive','KEEP',{flag:'wx'});f.writeFileSync(p+'/exec.sh','#!/bin/sh\\necho UNFS_BIND_OK\\n');f.chmodSync(p+'/exec.sh',0o755)")
  v=json.loads(node(b,"const f=require('fs'),p="+json.dumps(ROOT)+";let denied=false;try{f.openSync(p+'/exclusive','wx')}catch(e){denied=e.code==='EEXIST'};console.log(JSON.stringify({renamed:f.readFileSync(p+'/renamed','utf8'),link:f.readFileSync(p+'/link','utf8'),exec:require('child_process').execFileSync(p+'/exec.sh',{encoding:'utf8'}),denied,preserved:f.readFileSync(p+'/preexisting.txt','utf8')}))"));assert v['renamed']=='RENAMED' and v['link']==x+y and v['denied'] and v['exec']=='UNFS_BIND_OK\n' and v['preserved']=='KEEP_MAC_BIND_SOURCE',v;assert (source/'project/preexisting.txt').read_text()=='KEEP_MAC_BIND_SOURCE';return v
 case('cross-client rename relative symlink executable exclusive-create and existing-source preservation',ops)
 def native_write():
  z='NATIVE_MAC_'+uuid.uuid4().hex+'\n'
  code="import os;p="+repr(ROOT+'/'+file)+";f=open(p,'a');f.write("+repr(z)+");f.flush();os.fsync(f.fileno());f.close()"
  vt('exec',VM,'/usr/bin/sudo','-n','-u','admin','/usr/bin/python3','-c',code)
  return exact(x+y+z)
 case('native Mac mounted append reaches original Mac source and both Linux mounted clients',native_write)
 def native_git():
  result=vmsh('cd '+ROOT+' && /usr/bin/git init --quiet && /usr/bin/git -c user.name=Probe -c user.email=probe@example.invalid add preexisting.txt && /usr/bin/git -c user.name=Probe -c user.email=probe@example.invalid commit --quiet -m NativeMac && /usr/bin/git rev-parse HEAD',timeout=30).stdout.strip()
  assert len(result)==40,result
  linux=d('exec',a,'git','-C',ROOT,'rev-parse','HEAD').stdout.strip();assert linux==result,(linux,result)
  node(a,"require('fs').appendFileSync("+json.dumps(ROOT+'/preexisting.txt')+",'\\nLINUX_GIT_UPDATE')")
  d('exec',a,'git','-C',ROOT,'add','preexisting.txt');d('exec',a,'git','-C',ROOT,'-c','user.name=Probe','-c','user.email=probe@example.invalid','commit','--quiet','-m','LinuxModify')
  linuxCommit=d('exec',a,'git','-C',ROOT,'rev-parse','HEAD').stdout.strip();nativeCommit=vmsh('cd '+ROOT+' && /usr/bin/git rev-parse HEAD').stdout.strip();assert linuxCommit==nativeCommit and linuxCommit!=result,(linuxCommit,nativeCommit)
  return {'nativeNode':VM,'linuxNode':a,'macCommit':result,'linuxCommit':linuxCommit,'plainGitOwnerAdmission':True,'noSafeDirectoryOverride':True,'perInvocationNameEmailOnly':True}
 case('single-user UID presentation permits coordinated native Mac and Linux Git without safe.directory override',native_git)
 R['uncovered']=['native Linux/Mac service binary','no network lock manager/cross-client fcntl','outage/restart/permission matrix and actual agents','finished one-command service/TLS/authorization/platform distribution','physical LAN/current-source/GUI/delivery'];save()
except Exception as e:R['fatal']=repr(e);print('PROBE FAILURE',repr(e),flush=True);save()
finally:
 if 'vm_created_mount' in globals() and vm_created_mount:
  z=vmsh('sudo -n /sbin/umount '+M,check=False);R['cleanup'].append({'nativeUnmountRc':z.returncode});vm_created_mount=z.returncode!=0
 # Clients must detach before stopping healthy source service.
 for n in reversed(containers[1:]):z=d('rm','-f','-v',n,check=False);R['cleanup'].append({'container':n,'rc':z.returncode})
 for n in reversed(volumes):z=d('volume','rm',n,check=False);R['cleanup'].append({'volume':n,'rc':z.returncode})
 if containers:
  R['serverLog']=d('logs',containers[0],check=False).stdout;z=d('rm','-f','-v',containers[0],check=False);R['cleanup'].append({'container':containers[0],'rc':z.returncode})
 for kind,names in [('container',containers),('volume',volumes)]:
  for n in names:z=d(kind,'inspect',n,check=False);R['cleanup'].append({'kind':kind,'name':n,'absent':z.returncode!=0})
 if 'vm_process' in globals():vm_cleanup()
 assert scratch.name.startswith('ab-sf-fr042-owned-') and scratch.parent==Path(tempfile.gettempdir());shutil.rmtree(scratch);R['cleanup'].append({'ownedHostScratchRemoved':not scratch.exists()});save()
print(json.dumps({'run':S,'passes':sum(c['status']=='PASS' for c in R['cases']),'fatal':R.get('fatal')}),flush=True)
raise SystemExit(1 if R.get('fatal') else 0)
