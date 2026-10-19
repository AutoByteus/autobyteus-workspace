"""Designer-owned native macOS NFS server/folder capability. No models/auth.

Fresh public Mac VM only, two UID10001 Docker clients from immutable app image.
No host nfsd/export/mount or existing user storage/node modifications. Normal
OS operations, not production service implementation or final API/E2E proof.
"""
from pathlib import Path
import subprocess as sp,json,time,uuid,socket,sys,threading
P=Path(__file__).resolve().parent;S='ab-sf-fr036-'+uuid.uuid4().hex[:8]
M='/Volumes/autobyteus-shared';ROOT=M+'/project'
APP_IMAGE='sha256:b1411fa6f5004dfe073d4841119a9c5da15c18ea93009fa20d6e312b25cd71d1'
R={'run':S,'scope':'native Mac kernel NFSv3 server selected APFS source and two real Linux kernel Docker-client mounts on one physical Mac; component capability only, not final service/source/UI/LAN/agents','commands':[],'cases':[],'cleanup':[]};containers=[];volumes=[];server_started=False
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
    SOURCE='/Users/admin/.ab-sf-native-source-'+S;storage_id=uuid.uuid4().hex
    def native_server():
        global server_started
        vmsh('test ! -e /etc/exports; test ! -e '+SOURCE+'; mkdir '+SOURCE+'; mkdir '+SOURCE+'/project '+SOURCE+'/.owned-identity')
        macpy("import json;open("+repr(SOURCE+'/.owned-identity/storage.json')+",'w').write("+repr(json.dumps({'storageId':storage_id}))+ ");open("+repr(SOURCE+'/project/preexisting.txt')+",'w').write('KEEP_NATIVE_SOURCE')")
        cfg='nfs.server.mount.port=20048\nnfs.server.bonjour=0\nnfs.server.udp=0\nnfs.server.mount.require_resv_port=0\nnfs.lockd.port=32803\nnfs.lockd.send_using_tcp=1\n'
        exports=SOURCE+' -mapall=501:20 '+vm_gateway+' 127.0.0.1\n'
        for path,data in [('/etc/nfs.conf',cfg),('/etc/exports',exports)]:
            q=sp.run([T,'exec','-i',VM,'/usr/bin/sudo','-n','/bin/sh','-c','cat > '+path],env=ENV,input=data,text=True,capture_output=True,timeout=15);assert q.returncode==0,q.stderr
        vt('exec',VM,'/usr/bin/sudo','-n','/sbin/nfsd','checkexports')
        vt('exec',VM,'/usr/bin/sudo','-n','/sbin/nfsd','enable');server_started=True
        status=vt('exec',VM,'/usr/bin/sudo','-n','/sbin/nfsd','status').stdout
        assert 'running' in status.lower(),status
        R['nativeMacServer']={'node':VM,'sourceFolder':SOURCE,'storageId':storage_id,'protocol':3,'export':exports,'configuration':cfg,'mapAll':'501:20','allowedPeers':[vm_gateway,'127.0.0.1'],'mountReservedPortCheckDisabledForDockerDesktopProxy':True,'notFinalSecurityPolicy':True};save()
        return {**R['nativeMacServer'],'status':status,'hostMacServiceUntouched':True}
    case('fresh native macOS nfsd serves a selected nonempty local APFS folder with exact peer allowlist',native_server)
    def mac_self_mount():
        global vm_created_mount
        registration=vmsh('/usr/sbin/rpcinfo -p 127.0.0.1').stdout
        vmsh('test ! -e '+M+'; sudo -n mkdir '+M)
        vmsh('sudo -n mount -t nfs -o vers=3,tcp,hard,actimeo=1,resvport,retrycnt=0,port=2049,mountport=20048 127.0.0.1:'+SOURCE+' '+M,timeout=30);vm_created_mount=True
        assert json.loads(vmsh('cat '+M+'/.owned-identity/storage.json').stdout)['storageId']==storage_id
        assert vmsh('cat '+ROOT+'/preexisting.txt').stdout=='KEEP_NATIVE_SOURCE'
        return {'node':VM,'mount':M,'project':ROOT,'source':SOURCE,'sameStorageId':storage_id,'rpcRegistration':registration,'originalFilePreserved':True}
    case('native Mac mounts its selected APFS source through actual NFSv3 before Linux-client negotiation',mac_self_mount)
    probe=S+'-route-check';containers.append(probe)
    d('run','-d','--name',probe,'--label','org.autobyteus.probe=fr-036','--entrypoint','tail',APP_IMAGE,'-f','/dev/null')
    def route():
        r=d('exec',probe,'python3','-c',"import socket,json;z=[]\nfor p in [111,2049,20048]:\n s=socket.create_connection(("+repr(vm_ip)+",p),3);z.append(p);s.close()\nprint(json.dumps({'reachable':z}))")
        return {'dockerProbe':probe,'exactOwnedMacGuest':vm_ip,'ports':json.loads(r.stdout)['reachable'],'noHostRelayNeeded':True,'notPhysicalLan':True}
    case('Docker client reaches exact native Mac guest RPC/NFS/MOUNT ports through existing private route',route)
    def mount_clients():
        global vm_created_mount
        rows=[]
        for suffix in ['a','b']:
            volume=S+'-nfs-'+suffix;volumes.append(volume)
            # First establish ordinary file capability; nolock is explicit and
            # does NOT advertise cross-client fcntl locking for this round.
            options='addr='+vm_ip+',vers=3,proto=tcp,mountproto=tcp,mountvers=3,mountport=20048,nolock,hard,timeo=50,retrans=2,actimeo=1,nosharecache'
            d('volume','create','--label','org.autobyteus.probe=fr-036','--driver','local','--opt','type=nfs','--opt','device=:'+SOURCE,'--opt','o='+options,volume)
            name=S+'-client-'+suffix;containers.append(name)
            d('run','-d','--name',name,'--label','org.autobyteus.probe=fr-036','--user','10001:10001','--entrypoint','tail','--mount','type=volume,src='+volume+',dst='+M+',volume-nocopy',APP_IMAGE,'-f','/dev/null',timeout=60)
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
    R['uncovered']=['cross-client fcntl/NLM locking: Linux mounts explicitly nolock','finished service binary/config/lifecycle/distribution/security','real instructed agents on native Mac server','physical multiple computers/private LAN','source implementation/UI/final E2E'];save()
except Exception as e:R['fatal']=repr(e);save();print('PROBE FAILURE',repr(e),flush=True)
finally:
    # Keep Mac server healthy until every Docker mount is detached.
    for name in reversed(containers):
        q=d('rm','-f','-v',name,check=False);R['cleanup'].append({'container':name,'rc':q.returncode})
    for name in reversed(volumes):
        q=d('volume','rm',name,check=False);R['cleanup'].append({'volume':name,'rc':q.returncode})
    if 'vm_process' in globals() and vm_process and vm_process.poll() is None:
        if vm_created_mount:
            q=vmsh('sudo -n umount '+M,check=False);R['cleanup'].append({'nativeUnmountRc':q.returncode});vm_created_mount=q.returncode!=0
        if server_started:
            q=vt('exec',VM,'/usr/bin/sudo','-n','/sbin/nfsd','disable',check=False);R['cleanup'].append({'guestNfsdDisableRc':q.returncode})
        vm_cleanup()
    for kind,names in [('container',containers),('volume',volumes)]:
        for name in names:
            q=d(kind,'inspect',name,check=False);R['cleanup'].append({'absence_kind':kind,'name':name,'absent':q.returncode!=0})
    save()
print(json.dumps({'run':S,'passes':sum(c['status']=='PASS' for c in R['cases']),'fatal':R.get('fatal')}),flush=True)
sys.exit(1 if R.get('fatal') else 0)
