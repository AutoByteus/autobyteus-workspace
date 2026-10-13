"""Designer-owned native macOS NFS server/folder capability. No models/auth.

Fresh public Mac VM only, two UID10001 Docker clients from immutable app image.
No host nfsd/export/mount or existing user storage/node modifications. Normal
OS operations, not production service implementation or final API/E2E proof.
"""
from pathlib import Path
import subprocess as sp,json,time,uuid,socket,sys,threading
P=Path(__file__).resolve().parent;S='ab-sf-fr045-'+uuid.uuid4().hex[:8]
M='/Volumes/autobyteus-shared';ROOT=M+'/project'
APP_IMAGE='sha256:b1411fa6f5004dfe073d4841119a9c5da15c18ea93009fa20d6e312b25cd71d1'
R={'run':S,'scope':'native Mac userspace nonroot pinned UNFS3 server selected APFS source and native Mac/two Linux Docker-client NFS3 mounts on one physical Mac; component only, no final service/source/UI/LAN/agents','commands':[],'cases':[],'cleanup':[]};containers=[];volumes=[];server_started=False
def save():(P/'probe-result.json').write_text(json.dumps(R,indent=2))
def run(*argv,timeout=45,check=True):
    r=sp.run(argv,capture_output=True,text=True,timeout=timeout)
    R['commands'].append({'argv':list(argv),'rc':r.returncode,'stdout':r.stdout,'stderr':r.stderr});save()
    if check and r.returncode:raise RuntimeError(str(argv[:4])+': '+r.stderr[-1200:])
    return r
def d(*args,**kw):return run('docker',*args,**kw)
def case(name,action):
    start=time.monotonic();row={'name':name}
    try:row.update(status='PASS',result=action());print('PASS',name,flush=True)
    except Exception as e:row.update(status='FAIL',error=repr(e));print('FAIL',name,repr(e),flush=True);raise
    finally:row['seconds']=round(time.monotonic()-start,3);R['cases'].append(row);save()
def node(n,code):return d('exec',n,'node','-e',code).stdout.strip()
def macpy(code,**kw):return vt('exec',VM,'/usr/bin/sudo','-n','-u','admin','/usr/bin/python3','-c',code,**kw).stdout.strip()
try:
    exec((P/'vm-client.py').read_text(),globals());vm_boot()
    R['previousFailureDiagnostic']=vmsh('/bin/cat /Users/admin/.ab-sf-native-config-ab-sf-fr044-4d455b07/server.log').stdout;save();print(R['previousFailureDiagnostic'],flush=True)
    SOURCE='/Users/admin/.ab-sf-native-source-'+S;storage_id=uuid.uuid4().hex
    def native_server():
        global server_started
        vmsh('test ! -e /etc/exports; test ! -e '+SOURCE+'; mkdir '+SOURCE+'; mkdir '+SOURCE+'/project '+SOURCE+'/.owned-identity')
        macpy("import json;open("+repr(SOURCE+'/.owned-identity/storage.json')+",'w').write("+repr(json.dumps({'storageId':storage_id}))+ ");open("+repr(SOURCE+'/project/preexisting.txt')+",'w').write('KEEP_NATIVE_SOURCE')")
        global native_server_pid
        config='/Users/admin/.ab-sf-native-config-'+S;vmsh('mkdir '+config)
        cfg='pinned UNFS3 ec1660ba33c80d5c67131e163e68834c1a10e243 native arm64, single-user nonroot, TCP-only NFS/MOUNT same port12049, no rpcbind/NLM'
        exports=SOURCE+' '+vm_gateway+'(rw,all_squash,anonuid=501,anongid=20,insecure) '+vm_ip+'(rw,all_squash,anonuid=501,anongid=20,insecure)\n'
        vmsh('/usr/bin/printf %s '+__import__('shlex').quote(exports)+' > '+config+'/exports')
        r=vmsh('/usr/bin/nohup /Users/admin/.ab-sf-unfs-install/sbin/unfsd -d -s -p -t -n 12049 -m 12049 -l '+vm_ip+' -e '+config+'/exports > '+config+'/server.log 2>&1 < /dev/null & echo $!')
        native_server_pid=int(r.stdout.strip());server_started=True
        time.sleep(.2)
        status=vmsh('/bin/ps -p '+str(native_server_pid)+' -o uid=,command=',check=False).stdout
        R['nativeServerStartLog']=vmsh('/bin/cat '+config+'/server.log').stdout;save()
        assert status, R['nativeServerStartLog']
        assert '/Users/admin/.ab-sf-unfs-install/sbin/unfsd' in status and status.strip().startswith('501'),status
        R['nativeMacServer']={'node':VM,'sourceFolder':SOURCE,'storageId':storage_id,'protocol':3,'export':exports,'configuration':cfg,'mapAll':'501:20','allowedPeers':[vm_gateway,vm_ip],'singleUserUidPresentation':True,'noPrivilegedServerOrHostChanges':True,'noNetworkLockManager':True,'mountReservedPortCheckDisabledForDockerDesktopProxy':True,'notFinalSecurityPolicy':True};save()
        return {**R['nativeMacServer'],'status':status,'hostMacServiceUntouched':True}
    case('native nonroot pinned UNFS3 server uses chosen APFS folder without Docker or OS nfsd changes',native_server)
    def nfs_rpc_ready():
        import struct
        attempts=[];start=time.monotonic()
        while time.monotonic()-start<20:
            try:
                with socket.create_connection((vm_ip,12049),1) as c:
                    c.settimeout(1);xid=uuid.uuid4().int&0xffffffff
                    body=struct.pack('!10I',xid,0,2,100003,3,0,0,0,0,0)
                    c.sendall(struct.pack('!I',0x80000000|len(body))+body)
                    h=c.recv(4);assert len(h)==4,h
                    n=struct.unpack('!I',h)[0]&0x7fffffff;data=b''
                    while len(data)<n:data+=c.recv(n-len(data))
                    vals=struct.unpack('!'+str(len(data)//4)+'I',data);attempts.append(list(vals))
                    if vals[:3]==(xid,1,0) and vals[-1]==0:return {'node':VM,'rpcProgram':100003,'version':3,'nullAccepted':True,'attempts':attempts,'seconds':round(time.monotonic()-start,3),'notFileReadiness':True}
            except Exception as e:attempts.append(repr(e))
            time.sleep(.3)
        raise AssertionError(attempts)
    case('actual native Mac NFSv3 RPC NULL accepted after native nonroot daemon start',nfs_rpc_ready)
    def mac_self_mount():
        global vm_created_mount
        registration=vmsh('/usr/sbin/rpcinfo -n 12049 -t '+vm_ip+' 100003 3').stdout
        vmsh('test ! -e '+M+'; sudo -n mkdir '+M)
        vmsh('sudo -n /sbin/mount -t nfs -o vers=3,tcp,hard,actimeo=1,locallocks,resvport,retrycnt=0,port=12049,mountport=12049 '+vm_ip+':'+SOURCE+' '+M,timeout=30);vm_created_mount=True
        assert json.loads(vmsh('cat '+M+'/.owned-identity/storage.json').stdout)['storageId']==storage_id
        assert vmsh('cat '+ROOT+'/preexisting.txt').stdout=='KEEP_NATIVE_SOURCE'
        return {'node':VM,'mount':M,'project':ROOT,'source':SOURCE,'sameStorageId':storage_id,'rpcRegistration':registration,'originalFilePreserved':True}
    case('native Mac mounts its selected APFS source through actual NFSv3 before Linux-client negotiation',mac_self_mount)
    probe=S+'-route-check';containers.append(probe)
    d('run','-d','--name',probe,'--label','org.autobyteus.probe=fr-045','--entrypoint','tail',APP_IMAGE,'-f','/dev/null')
    def route():
        r=d('exec',probe,'python3','-c',"import socket,json;z=[]\nfor p in [12049]:\n s=socket.create_connection(("+repr(vm_ip)+",p),3);z.append(p);s.close()\nprint(json.dumps({'reachable':z}))")
        return {'dockerProbe':probe,'exactOwnedMacGuest':vm_ip,'ports':json.loads(r.stdout)['reachable'],'noHostRelayNeeded':True,'notPhysicalLan':True}
    case('Docker client reaches exact native Mac guest same explicit NFS/MOUNT TCP port through existing private route',route)
    def mount_clients():
        global vm_created_mount
        rows=[]
        for suffix in ['a','b']:
            volume=S+'-nfs-'+suffix;volumes.append(volume)
            # First establish ordinary file capability; nolock is explicit and
            # does NOT advertise cross-client fcntl locking for this round.
            options='addr='+vm_ip+',vers=3,proto=tcp,mountproto=tcp,mountvers=3,port=12049,mountport=12049,nolock,hard,timeo=50,retrans=2,actimeo=1,nosharecache'
            d('volume','create','--label','org.autobyteus.probe=fr-045','--driver','local','--opt','type=nfs','--opt','device=:'+SOURCE,'--opt','o='+options,volume)
            name=S+'-client-'+suffix;containers.append(name)
            d('run','-d','--name',name,'--label','org.autobyteus.probe=fr-045','--user','10001:10001','--entrypoint','tail','--mount','type=volume,src='+volume+',dst='+M+',volume-nocopy',APP_IMAGE,'-f','/dev/null',timeout=60)
            result=node(name,"const f=require('fs');console.log(JSON.stringify({uid:process.getuid(),identity:JSON.parse(f.readFileSync("+json.dumps(M+'/.owned-identity/storage.json')+",'utf8')),mounts:f.readFileSync('/proc/mounts','utf8').split('\\n').filter(x=>x.includes(' '+"+json.dumps(M)+"+' '))}))")
            obj=json.loads(result);assert obj['uid']==10001 and obj['identity']['storageId']==storage_id,obj
            rows.append({'node':name,'mount':M,'project':ROOT,'identity':obj,'options':options})
        R['clientNodes']=rows;save();return {'linuxClients':rows,'macClient':VM,'macMount':M,'sameUnderlyingNativeFolder':SOURCE,'crossClientFcntlClaim':False}
    case('native Mac and two unprivileged Docker clients mount same Mac-served storage at identical root',mount_clients)
    a,b=[r['node'] for r in R['clientNodes']]
    def exact(expected,name):
        start=time.monotonic();last=None
        while time.monotonic()-start<5:
            vals=[node(n,"console.log(JSON.stringify(require('fs').readFileSync("+json.dumps(ROOT+'/'+name)+",'utf8')))") for n in [a,b]]
            vals=[json.loads(x) for x in vals]+[vmsh('cat '+ROOT+'/'+name).stdout,vmsh('cat '+SOURCE+'/project/'+name).stdout]
            if all(x==expected for x in vals):return {'nodes':[a,b,VM],'sourceFolder':SOURCE,'path':ROOT+'/'+name,'seconds':round(time.monotonic()-start,3),'allExact':True}
            last=vals;time.sleep(.2)
        raise AssertionError(last)
    filename='native-mac-server.txt';x='MAC_NATIVE_SOURCE_'+uuid.uuid4().hex+'\n';y='LINUX_B_'+uuid.uuid4().hex+'\n'
    def source_write():
        macpy("import os;f=open("+repr(SOURCE+'/project/'+filename)+",'w');f.write("+repr(x)+");f.flush();os.fsync(f.fileno());f.close()")
        return exact(x,filename)
    case('ordinary Mac source-folder write becomes exact mounted content on all clients',source_write)
    def modify():
        node(b,"const f=require('fs');let p="+json.dumps(ROOT+'/'+filename)+";let q=f.openSync(p,'a');f.writeSync(q,"+json.dumps(y)+");f.fsyncSync(q);f.closeSync(q)")
        return exact(x+y,filename)
    case('Linux mounted modification is read through Mac mount and original configured source folder',modify)
    def operations():
        code="const f=require('fs'),p="+json.dumps(ROOT)+";f.writeFileSync(p+'/exclusive','KEEP',{flag:'wx'});f.symlinkSync('"+filename+"',p+'/relative');f.writeFileSync(p+'/replace.tmp','RENAMED');f.renameSync(p+'/replace.tmp',p+'/renamed');f.writeFileSync(p+'/run.sh','#!/bin/sh\\necho NATIVE_MAC_EXPORT_OK\\n');f.chmodSync(p+'/run.sh',0o755);console.log('done')"
        node(a,code)
        assert vmsh('cat '+ROOT+'/relative').stdout==x+y
        r=macpy("from pathlib import Path;p=Path("+repr(ROOT+'/exclusive')+");\ntry:p.open('x');print('WRONG')\nexcept FileExistsError:print('EXCLUSIVE_DENIED')");assert r=='EXCLUSIVE_DENIED'
        r=node(b,"const c=require('child_process'),f=require('fs');console.log(JSON.stringify({renamed:f.readFileSync("+json.dumps(ROOT+'/renamed')+",'utf8'),run:c.execFileSync("+json.dumps(ROOT+'/run.sh')+",{encoding:'utf8'}),preserved:f.readFileSync("+json.dumps(ROOT+'/preexisting.txt')+",'utf8')}))");v=json.loads(r);assert v['renamed']=='RENAMED' and 'NATIVE_MAC_EXPORT_OK' in v['run'] and v['preserved']=='KEEP_NATIVE_SOURCE',v
        return {'nodes':[VM,a,b],'exclusiveCrossClientDenied':True,'relativeSymlink':True,'rename':True,'executable':True,'originalSourceFixturePreserved':True}
    case('Mac-served source preserves existing data and supports shared rename/symlink/executable/exclusive-create',operations)
    R['uncovered']=['no cross-client fcntl/NLM: Linux nolock/Mac locallocks explicit','finished service binary/config/lifecycle/distribution/security','real instructed agents on native Mac server','physical multiple computers/private LAN','source implementation/UI/final E2E'];save()
except Exception as e:R['fatal']=repr(e);save();print('PROBE FAILURE',repr(e),flush=True)
finally:
    # Keep Mac server healthy until every Docker mount is detached.
    for name in reversed(containers):
        q=d('rm','-f','-v',name,check=False);R['cleanup'].append({'container':name,'rc':q.returncode})
    for name in reversed(volumes):
        q=d('volume','rm',name,check=False);R['cleanup'].append({'volume':name,'rc':q.returncode})
    if 'vm_process' in globals() and vm_process and vm_process.poll() is None:
        if vm_created_mount:
            q=vmsh('sudo -n /sbin/umount '+M,check=False);R['cleanup'].append({'nativeUnmountRc':q.returncode});vm_created_mount=q.returncode!=0
        if server_started:
            q=vmsh('/bin/kill -TERM '+str(native_server_pid),check=False);R['cleanup'].append({'nativeUnfsExactPidTermRc':q.returncode});time.sleep(.2);R['cleanup'].append({'nativeUnfsExitObservation':vmsh('/bin/ps -p '+str(native_server_pid)+' -o pid=,stat=,command=',check=False).stdout})
        vm_cleanup()
    for kind,names in [('container',containers),('volume',volumes)]:
        for name in names:
            q=d(kind,'inspect',name,check=False);R['cleanup'].append({'absence_kind':kind,'name':name,'absent':q.returncode!=0})
    save()
print(json.dumps({'run':S,'passes':sum(c['status']=='PASS' for c in R['cases']),'fatal':R.get('fatal')}),flush=True)
sys.exit(1 if R.get('fatal') else 0)
