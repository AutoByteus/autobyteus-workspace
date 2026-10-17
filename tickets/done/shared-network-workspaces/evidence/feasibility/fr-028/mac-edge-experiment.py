# Designer-owned native filesystem edge capabilities, no inference/auth/source edits.
import select,hashlib
private='/Users/admin/.ab-sf-edge-'+S
vmsh('umask 077; mkdir '+private)
def macpy(code,**kw):return vt('exec',VM,'/usr/bin/sudo','-n','-u','admin','/usr/bin/python3','-c',code,**kw)

def binary():
    code=f"import os,hashlib,json;p={ROOT+'/binary.bin'!r};z=os.urandom(1048576);f=open(p,'wb');f.write(z);f.flush();os.fsync(f.fileno());f.close();print(json.dumps({{'sha256':hashlib.sha256(z).hexdigest(),'bytes':len(z)}}))"
    x=json.loads(macpy(code).stdout)
    for n in nodes:
        h=nodejs(n['name'],f"const f=require('fs'),c=require('crypto');console.log(c.createHash('sha256').update(f.readFileSync({json.dumps(ROOT+'/binary.bin')})).digest('hex'))");assert h==x['sha256']
    h=d('exec',server,'python3','-c',"import hashlib;print(hashlib.sha256(open('/export/project/binary.bin','rb').read()).hexdigest())").stdout.strip();assert h==x['sha256']
    return {'mac':VM,'peers':[n['name'] for n in nodes],**x}
case('native Mac fsynced1MiB binary has exact hashes on both Linux mounts and backing',binary)

def concurrent():
    mac=[T,'exec',VM,'/usr/bin/python3','-c',f"from pathlib import Path;from concurrent.futures import ThreadPoolExecutor;p=Path({ROOT!r});e=ThreadPoolExecutor(8);list(e.map(lambda i:(p/('mac-'+str(i)+'.txt')).write_text('MAC'+str(i)),range(20)));print('MAC_DONE')"]
    m=sp.Popen(mac,env=ENV,stdout=sp.PIPE,stderr=sp.PIPE,text=True)
    nodejs(b['name'],f"const f=require('fs/promises');Promise.all(Array.from({{length:20}},(_,i)=>f.writeFile({json.dumps(ROOT)}+'/linux-'+i+'.txt','LINUX'+i))).then(()=>console.log('LINUX_DONE'))")
    out,err=m.communicate(timeout=30);assert m.returncode==0,(out,err)
    result=json.loads(nodejs(a['name'],f"const f=require('fs');let count=0;for(let i=0;i<20;i++){{if(f.readFileSync({json.dumps(ROOT)}+'/mac-'+i+'.txt','utf8')!=='MAC'+i)throw Error('mac');if(f.readFileSync({json.dumps(ROOT)}+'/linux-'+i+'.txt','utf8')!=='LINUX'+i)throw Error('linux');count+=2}}console.log(JSON.stringify({{count}}))"))
    assert result['count']==40;return {'mac':VM,'linuxWriter':b['name'],'differentFiles':40,'exactContents':True}
case('Mac and Linux concurrently publish40 distinct files without lost values',concurrent)

lock=None;reader=None;paused=False
try:
    def locks():
        global lock
        path=ROOT+'/advisory.lock'
        code="import fcntl,sys;f=open("+repr(path)+",'a+');fcntl.lockf(f,fcntl.LOCK_EX);print('LOCKED',flush=True);sys.stdin.readline();fcntl.lockf(f,fcntl.LOCK_UN);f.close();print('UNLOCKED',flush=True)"
        lock=sp.Popen([T,'exec','-i',VM,'/usr/bin/python3','-u','-c',code],env=ENV,stdin=sp.PIPE,stdout=sp.PIPE,stderr=sp.PIPE,text=True)
        assert select.select([lock.stdout],[],[],35)[0] and lock.stdout.readline().strip()=='LOCKED'
        test="import fcntl,json;f=open("+repr(path)+",'a+');\ntry: fcntl.lockf(f,fcntl.LOCK_EX|fcntl.LOCK_NB);print(json.dumps({'blocked':False}));fcntl.lockf(f,fcntl.LOCK_UN)\nexcept BlockingIOError: print(json.dumps({'blocked':True}))"
        r=json.loads(d('exec',b['name'],'python3','-c',test).stdout);assert r['blocked'],r
        lock.stdin.write('\n');lock.stdin.flush();out,err=lock.communicate(timeout=30);assert lock.returncode==0 and 'UNLOCKED' in out,(out,err);lock=None
        r=json.loads(d('exec',b['name'],'python3','-c',test).stdout);assert not r['blocked'],r
        return {'mac':VM,'linux':b['name'],'crossClientPOSIXLockDeniedWhileHeld':True,'explicitReleaseThenAcquire':True,'notForcedArbitraryWriterCoordination':True}
    case('Mac POSIX advisory lock excludes Linux and explicit release permits Linux acquire',locks)

    def git_observation():
        repo=ROOT+'/git-case';home=private+'/git-home'
        vmsh('mkdir '+home+'; /usr/bin/env -i HOME='+home+' PATH=/usr/bin:/bin:/usr/sbin:/sbin git init '+repo)
        r=vmsh('/usr/bin/env -i HOME='+home+' PATH=/usr/bin:/bin:/usr/sbin:/sbin git -C '+repo+' status --porcelain',check=False)
        x={'node':VM,'defaultStatusExit':r.returncode,'defaultStderr':r.stderr,'reportedOwner':vmsh('stat -f "%u %g" '+repo).stdout,'sameUserGitGlobalConfigChanged':False}
        R.setdefault('observations',[]).append({'kind':'ordinary Git ownership/trust','result':x});save()
        assert r.returncode==0 or 'dubious ownership' in r.stderr.lower(),x
        env='/usr/bin/env -i HOME='+home+' PATH=/usr/bin:/bin:/usr/sbin:/sbin GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=safe.directory GIT_CONFIG_VALUE_0='+repo+' '
        vmsh(env+'git -C '+repo+' status --porcelain')
        vmsh("printf git-data > "+repo+'/proof.txt; '+env+'git -C '+repo+' add proof.txt; '+env+"git -C "+repo+" -c user.name=Owned-Test -c user.email=test@example.invalid commit -m proof")
        text=d('exec',a['name'],'git','-c','safe.directory='+repo,'-C',repo,'show','HEAD:proof.txt').stdout;assert text=='git-data',text
        return {'observation':x,'boundedPrivateProcessTrustWorks':True,'scope':repo,'noGlobalWildcardOrUserGitConfigEdit':True,'LinuxReadsSameSharedCommit':True,'defaultGitStillNeedsIntegrationDecision':r.returncode!=0}
    case('shared Git transaction works with explicit process-scoped exact-repository trust; default owner evidence retained',git_observation)

    def outage():
        global paused,reader
        fresh='uncached-'+uuid.uuid4().hex+'.txt';value='RECOVERED_'+uuid.uuid4().hex
        d('exec',server,'python3','-c',"from pathlib import Path;p=Path('/export/project/')/"+repr(fresh)+";p.write_text("+repr(value)+")")
        d('pause',server);paused=True
        start=time.monotonic();reader=sp.Popen([T,'exec',VM,'/usr/bin/python3','-u','-c',"print(open("+repr(ROOT+'/'+fresh)+").read(),flush=True)"],env=ENV,stdout=sp.PIPE,stderr=sp.PIPE,text=True)
        time.sleep(2);blocked=reader.poll() is None
        control=vmsh('printf LOCAL_CONTROL_ALIVE',timeout=5).stdout;assert control=='LOCAL_CONTROL_ALIVE'
        d('unpause',server);paused=False
        out,err=reader.communicate(timeout=45);assert reader.returncode==0 and out.strip()==value,(out,err)
        elapsed=round(time.monotonic()-start,3);reader=None
        return {'mac':VM,'service':server,'uncachedReadStalledWhilePaused':blocked,'privateLocalControlResponsive':True,'freshReadExactAfterRestore':True,'seconds':elapsed,'notProductionAdmissionOrBoundedKernelSyscallPromise':True}
    case('Mac uncached hard-NFS read stalls through service pause then returns exact bytes after restore; local control responds',outage)
finally:
    if paused:d('unpause',server,check=False)
    for p in [lock,reader]:
        if p and p.poll() is None:
            if p is lock:
                try:p.stdin.write('\n');p.stdin.flush()
                except Exception:pass
            try:p.communicate(timeout=20)
            except sp.TimeoutExpired:p.kill();p.communicate(timeout=10)
    vmsh('/bin/rm -rf '+private,check=False)
R['uncovered']=['production scoped Git/trust integration decision','Mac bounded admission/identity child ownership and full production paths','normal user OS approval/setup/apply/rerun/restart/detach','physical LAN','current source/UI/independent final validation'];save()
