"""Designer-owned Darwin capability probe; NOT shipped setup/admission code.

Only local mount metadata and TCP are checked in this parent. Potentially
blocking mount IO is confined to one exact child; its slot is not released on
a timeout/signal alone. Native Python is test infrastructure, not distribution.
"""
import sys,os,json,time,socket,struct,subprocess,threading,select
cfg=json.loads(sys.argv[1]); child=None; starts=0; beats=0; stop=threading.Event()
def heartbeat():
    global beats
    while not stop.wait(.1):
        beats+=1
        with open(cfg['private']+'/heartbeat','w') as f:f.write(str(beats))
thread=threading.Thread(target=heartbeat,daemon=True);thread.start()
def emit(x):print(json.dumps(x),flush=True)
def rpc():
    xid=int.from_bytes(os.urandom(4),'big');body=struct.pack('!10I',xid,0,2,100003,4,0,0,0,0,0)
    start=time.monotonic()
    try:
        with socket.create_connection((cfg['server'],cfg['port']),timeout=.6) as s:
            s.settimeout(.6);s.sendall(struct.pack('!I',0x80000000|len(body))+body)
            data=b''
            while len(data)<4:
                s.settimeout(max(.001,.6-(time.monotonic()-start)));v=s.recv(4-len(data))
                if not v:raise OSError('closed')
                data+=v
            header=struct.unpack('!I',data)[0];length=header&0x7fffffff
            if not header&0x80000000 or length!=24:return {'ok':False,'code':'RPC_REPLY_REJECTED'}
            data=b''
            while len(data)<length:
                s.settimeout(max(.001,.6-(time.monotonic()-start)));v=s.recv(length-len(data))
                if not v:raise OSError('closed')
                data+=v
            ok=struct.unpack('!6I',data)==(xid,1,0,0,0,0)
            return {'ok':ok,'code':'RPC_NULL_SUCCESS' if ok else 'RPC_REPLY_REJECTED'}
    except (OSError,TimeoutError) as e:return {'ok':False,'code':type(e).__name__}
def state():
    global child
    exitcode=child.poll() if child else None
    if child and exitcode is not None:child=None
    return {'starts':starts,'alive':int(child is not None),'heartbeats':beats,'lastObservedExit':exitcode}
def check(c,prechecked=False):
    global child,starts
    start=time.monotonic();state()
    def result(x):return {**x,**state(),'seconds':round(time.monotonic()-start,3)}
    mounts=subprocess.run(['/sbin/mount'],capture_output=True,text=True,timeout=.5).stdout.splitlines()
    suffix=' on '+c['mount']+' ('
    row=next((r for r in mounts if suffix in r),None)
    if not row:return result({'status':'MISSING_MOUNT'})
    if '(nfs' not in row:return result({'status':'WRONG_FILESYSTEM'})
    source=row.split(suffix)[0]
    if source!=c['source']:return result({'status':'WRONG_MOUNT_SOURCE','actualSource':source})
    if child:return result({'status':'INDETERMINATE','code':'PREVIOUS_CHILD_NOT_EXITED'})
    if not prechecked:
        r=rpc()
        if not r['ok']:return result({'status':'UNAVAILABLE','rpc':r})
    code="""import json,sys,os
c=json.loads(sys.argv[1])
try:
    with open(c['mount']+c.get('identityPath','/.owned-identity/storage.json')) as f:v=json.load(f)
    print(json.dumps({'status':'READY' if v['storageId']==c['storageId'] else 'WRONG_STORAGE','actualStorageId':v['storageId']}),flush=True)
except PermissionError as e:print(json.dumps({'status':'PERMISSION_DENIED','errno':e.errno}),flush=True)
except Exception as e:print(json.dumps({'status':'INDETERMINATE','code':type(e).__name__}),flush=True)
"""
    child=subprocess.Popen(['/usr/bin/python3','-u','-c',code,json.dumps(c)],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    starts+=1;owned=child;limit=time.monotonic()+1.5
    while time.monotonic()<limit:
        if owned.poll() is not None:
            out,err=owned.communicate();rc=owned.returncode;child=None
            try:r=json.loads(out)
            except Exception:r={'status':'INDETERMINATE','code':'CHILD_NO_RECEIPT'}
            return result({**r,'childExit':rc})
        time.sleep(.025)
    owned.terminate()
    # A hard-NFS child can remain kernel-blocked. Signal != confirmed exit.
    return result({'status':'INDETERMINATE','code':'FILESYSTEM_PROBE_DEADLINE','exactChildPid':owned.pid,'exitConfirmed':False})
emit({'event':'READY','uid':os.getuid(),'cfg':cfg})
try:
    for line in sys.stdin:
        command=json.loads(line);action=command['action']
        if action=='close':break
        if action=='state':emit({'event':'STATE',**state()})
        if action=='rpc':emit({'event':'RPC','result':rpc()})
        if action=='check':emit({'event':'CHECK','result':check({**cfg,**command.get('override',{})},command.get('prechecked',False))})
finally:
    if child:
        child.kill()
        try:child.communicate(timeout=5)
        except subprocess.TimeoutExpired:
            emit({'event':'CLEANUP_INDETERMINATE','pid':child.pid});sys.exit(2)
    stop.set();thread.join(timeout=1)
