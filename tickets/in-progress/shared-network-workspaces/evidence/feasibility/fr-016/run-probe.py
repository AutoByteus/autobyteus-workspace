from pathlib import Path
import subprocess as sp
import json, time, uuid, socket, sys, urllib.request, urllib.parse, select

P = Path(__file__).resolve().parent
S = 'ab-sf-fr016-' + uuid.uuid4().hex[:8]
SERVICE_TAG = 'autobyteus-shared-feasibility:fr-016'
APP_IMAGE = 'sha256:62ee64827c53610eac932413a5cbe11761d713cda46609d2fa53c6495758b35a'
M = '/home/autobyteus/shared'
ROOT = M + '/project'
R = {'run': S, 'scope': 'owned Linux NFS bounded readiness capability with unprivileged Node client; no native models/auth/source/API/UI/Mac/LAN/setup proof', 'application_image': APP_IMAGE, 'commands': [], 'api': [], 'cases': [], 'cleanup': []}
containers, volumes, nfsvolumes, nodes = [], [], [], []
network = server = service_image = None
workers=[]

def save():
    (P/'probe-result.json').write_text(json.dumps(R, indent=2))

def run(*argv, timeout=45, check=True):
    t = time.monotonic()
    try:
        q = sp.run(argv, text=True, capture_output=True, timeout=timeout)
        row = {'argv': list(argv), 'rc': q.returncode, 'seconds': round(time.monotonic()-t, 3), 'stdout': q.stdout, 'stderr': q.stderr}
    except sp.TimeoutExpired as e:
        R['commands'].append({'argv': list(argv), 'timeout': timeout, 'stdout': str(e.stdout), 'stderr': str(e.stderr)})
        save()
        raise
    R['commands'].append(row)
    save()
    if check and q.returncode:
        raise RuntimeError(f'{argv[:3]} rc={q.returncode}: {q.stderr[-1800:]}')
    return q

def d(*argv, **kw):
    return run('docker', *argv, **kw)

def freeport():
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]

def volume(name, *args):
    volumes.append(name)
    return d('volume', 'create', '--label', 'org.autobyteus.task=shared-network-workspaces', '--label', 'org.autobyteus.probe=fr-016', *args, name).stdout.strip()

def start(name, image, *args, command=None):
    containers.append(name)
    return d('run', '-d', '--name', name, '--label', 'org.autobyteus.task=shared-network-workspaces', '--label', 'org.autobyteus.probe=fr-016', *args, image, *(command or []), timeout=80).stdout.strip()

def case(name, action):
    t = time.monotonic()
    row = {'name': name}
    try:
        row.update(status='PASS', result=action())
        print('PASS', name, flush=True)
    except Exception as e:
        row.update(status='FAIL', error=repr(e))
        print('FAIL', name, repr(e), flush=True)
        raise
    finally:
        row['seconds'] = round(time.monotonic()-t, 3)
        R['cases'].append(row)
        save()

paused=False
worker=None
error_file=None
storage_id=uuid.uuid4().hex
try:
    build=d('build','--pull=false','-t',SERVICE_TAG,str(P),timeout=240)
    (P/'image-build.log').write_text(build.stdout+build.stderr)
    service_image=d('image','inspect',SERVICE_TAG,'--format','{{.Id}}').stdout.strip()
    network=S+'-net';d('network','create','--label','org.autobyteus.probe=fr-016',network)
    net=json.loads(d('network','inspect',network).stdout)[0]['IPAM']['Config'][0]
    data=S+'-storage';volume(data)
    pseudo='/'+S;config=P/'ganesha.conf'
    config.write_text(f'''NFS_CORE_PARAM {{ Protocols = 4; Enable_NLM = false; Enable_UDP = false; mount_path_pseudo = true; }}
NFSv4 {{ Grace_Period = 30; Lease_Lifetime = 30; }}
EXPORT {{ Export_Id = 17; Path = /export; Pseudo = {pseudo}; Protocols = 4; Transports = TCP; SecType = sys;
 Access_Type = None; Squash = All_Squash; Anonymous_UID = 10001; Anonymous_GID = 10001;
 CLIENT {{ Clients = {net['Gateway']}; Access_Type = RW; Protocols = 4; }} FSAL {{ Name = VFS; }} }}
LOG {{ Components {{ ALL = EVENT; }} }}
''')
    server=S+'-storage-server'
    start(server,service_image,'--network',network,'--cap-add','DAC_READ_SEARCH','--mount',f'type=volume,src={data},dst=/export','--mount',f'type=bind,src={config},dst=/etc/ganesha/ganesha.conf,readonly')
    d('exec',server,'sh','-c','chown 10001:10001 /export; chmod 0770 /export; mkdir -p /run/ganesha /var/lib/nfs/ganesha /run/dbus; rpcbind -w; dbus-daemon --system --fork; ganesha.nfsd -F -L /tmp/ganesha.log -f /etc/ganesha/ganesha.conf >/tmp/ganesha-console.log 2>&1 &')
    time.sleep(7)
    ip=json.loads(d('inspect',server).stdout)[0]['NetworkSettings']['Networks'][network]['IPAddress']
    d('exec',server,'python3','-c',"from pathlib import Path;import os,json;p=Path('/export/.owned-identity');p.mkdir();q=p/'storage.json';q.write_text(json.dumps({'storageId':"+repr(storage_id)+"}));os.chown(p,0,0);os.chown(q,0,0);p.chmod(0o555);q.chmod(0o444)")
    nv=S+'-nfs';nfsvolumes.append(nv)
    volume(nv,'--driver','local','--opt','type=nfs','--opt',f'device=:{pseudo}','--opt',f'o=addr={ip},rw,nfsvers=4.1,proto=tcp,hard,timeo=50,retrans=2,actimeo=1,nosharecache')
    client=S+'-client'
    start(client,APP_IMAGE,'--network',network,'--entrypoint','sleep','--user','10001:10001','--cap-drop','ALL','--security-opt','no-new-privileges:true','--mount',f'type=volume,src={nv},dst={M},volume-nocopy',command=['infinity'])
    # Start helper scripts only in this owned client's writable /tmp.
    for name in ['mount-probe.mjs','readiness-owner.mjs']:
        d('cp',str(P/name),client+':/tmp/'+name)
    def topology_case():
        text=d('exec',client,'sh','-c',f'grep " {M} " /proc/mounts; id; grep CapEff /proc/self/status').stdout
        assert 'uid=10001' in text and 'CapEff:\t0000000000000000' in text,text
        return {'client':client,'service':server,'mount':text,'sameMacDockerVM':True,'modelOrAuth':False}
    case('daemon mounts common export into UID10001 zero-capability client, not a privileged in-container mount',topology_case)
    cfg={'mount':M,'server':ip,'expectedSource':ip+':'+pseudo,'storageId':storage_id}
    R['configuration']=cfg
    error_file=open(P/'readiness-owner.stderr.log','w')
    worker=sp.Popen(['docker','exec','-i',client,'node','/tmp/readiness-owner.mjs',json.dumps(cfg)],stdin=sp.PIPE,stdout=sp.PIPE,stderr=error_file,text=True)
    def response():
        assert select.select([worker.stdout],[],[],10)[0],'readiness owner protocol timeout'
        line=worker.stdout.readline();assert line,'readiness owner exited without response'
        return json.loads(line)
    R['owner_initialization']=response();assert R['owner_initialization']['event']=='READY'
    observations=[]
    def command(value):
        worker.stdin.write(json.dumps(value)+'\n');worker.stdin.flush()
        result=response();observations.append({'command':value,'receipt':result});R['observations']=observations;save();return result
    def check(expected,**kwargs):
        result=command({'action':'check',**kwargs})['result']
        assert result['status']==expected and result['seconds']<10,result
        return result
    case('healthy mounted identity verified, RPC liveness alone not treated as storage proof',lambda:check('READY'))
    case('wrong expected storage UUID refused despite healthy correct NFS mount',lambda:check('WRONG_STORAGE',override={'storageId':'different-storage'}))
    case('unexpected export/source refused before network filesystem IO',lambda:check('WRONG_MOUNT_SOURCE',override={'expectedSource':'another-server:/another-export'}))
    d('exec',client,'sh','-c','mkdir -p /tmp/owned-local-fallback/.owned-identity; printf local > /tmp/owned-local-fallback/existing-user-file')
    case('ordinary local directory is not accepted as shared mount or written as fallback',lambda:check('MISSING_MOUNT',override={'mount':'/tmp/owned-local-fallback'}))
    def denial():
        d('exec',server,'chmod','0000','/export/.owned-identity/storage.json');time.sleep(2)
        result=check('PERMISSION_DENIED')
        d('exec',server,'chmod','0444','/export/.owned-identity/storage.json');time.sleep(2)
        assert check('READY')['status']=='READY'
        return result
    case('actual mapped-client permission denial distinguished from wrong storage and outage',denial)
    def paused_service():
        global paused
        before=command({'action':'state'})
        d('pause',server);paused=True
        results=[check('UNAVAILABLE') for _ in range(3)]
        after=command({'action':'state'})
        assert after['heartbeats']>before['heartbeats'] and after['starts']==before['starts'],(before,after)
        d('unpause',server);paused=False
        assert check('READY')['status']=='READY'
        return {'before':before,'during':results,'after':after,'noFileChildrenStartedWhileRpcUnavailable':True}
    case('paused NFS service yields bounded unavailable; local work continues and no repeated file workers spawned',paused_service)
    def race():
        global paused
        rpc=command({'action':'rpc'});assert rpc['result']['ok'],rpc
        d('pause',server);paused=True;time.sleep(2)
        # Controlled supported check/use race: the RPC check succeeded immediately
        # before the outage; exercise the file phase under that validated premise.
        result=check('INDETERMINATE',prechecked=True)
        assert result.get('code')=='FILESYSTEM_PROBE_DEADLINE',result
        time.sleep(0.25)
        state=command({'action':'state'})
        assert state['maxAlive']<=1 and state['heartbeats']>result['heartbeats'],(result,state)
        again=command({'action':'check'})['result']
        assert again['status'] in ['UNAVAILABLE','INDETERMINATE'] and again['seconds']<10,again
        d('unpause',server);paused=False;time.sleep(1)
        recovered=check('READY')
        return {'rpcBeforeOutage':rpc,'fileRace':result,'stateAfterDeadline':state,'repeat':again,'recovered':recovered,'unconfirmedExitNotReportedAsConfirmed':result['exitConfirmed']==False}
    case('network loss after liveness check cannot block parent; child slot retained until actual exit then recovery',race)
    def preservation():
        text=d('exec',client,'cat','/tmp/owned-local-fallback/existing-user-file').stdout
        assert text=='local'
        state=command({'action':'state'});assert state['maxAlive']<=1 and state['alive']==0,state
        return {'localBytes':text,'ownerState':state}
    case('local directory preserved and no unreaped probe child after recovery',preservation)
    worker.stdin.write(json.dumps({'action':'close'})+'\n');worker.stdin.flush();out,_=worker.communicate(timeout=10)
    assert worker.returncode==0,(worker.returncode,out);worker=None
    R['uncovered']=['actual production admission/fallback and APIs','macOS platform probes/mount lifecycle','physical LAN','final permission/auth policy','one-command setup/source/UI/delivery']
except Exception as error:
    R['fatal']=repr(error);print('PROBE FAILURE',repr(error),flush=True)
finally:
    if paused and server:d('unpause',server,check=False);paused=False
    if worker:
        try:worker.stdin.write(json.dumps({'action':'close'})+'\n');worker.stdin.flush();worker.communicate(timeout=10)
        except Exception:worker.kill();worker.communicate()
    if error_file:error_file.close()
    if server:d('exec',server,'cat','/tmp/ganesha.log',check=False)
    for name in reversed([c for c in containers if c!=server]):
        q=d('rm','-f','-v',name,check=False);R['cleanup'].append({'container':name,'rc':q.returncode})
    for name in nfsvolumes:
        q=d('volume','rm',name,check=False);R['cleanup'].append({'volume':name,'rc':q.returncode})
    if server:
        q=d('rm','-f','-v',server,check=False);R['cleanup'].append({'container':server,'rc':q.returncode})
    for name in [v for v in volumes if v not in nfsvolumes]:
        q=d('volume','rm',name,check=False);R['cleanup'].append({'volume':name,'rc':q.returncode})
    if network:
        q=d('network','rm',network,check=False);R['cleanup'].append({'network':network,'rc':q.returncode})
    for kind,names in [('container',containers),('volume',volumes),('network',[network] if network else [])]:
        for name in names:
            q=d(kind,'inspect',name,check=False);R['cleanup'].append({'absence_kind':kind,'name':name,'absent':q.returncode!=0})
    if service_image:
        current=d('image','inspect',SERVICE_TAG,'--format','{{.Id}}',check=False)
        if current.returncode==0 and current.stdout.strip()==service_image:
            q=d('image','rm',SERVICE_TAG,check=False);R['cleanup'].append({'image_tag':SERVICE_TAG,'expected_id':service_image,'rc':q.returncode})
    save()
ok=all(c.get('rc',0)==0 and c.get('absent',True) for c in R['cleanup'])
print(json.dumps({'run':S,'passes':sum(c['status']=='PASS' for c in R['cases']),'fatal':R.get('fatal'),'cleanup_ok':ok}),flush=True)
sys.exit(1 if R.get('fatal') or not ok else 0)
