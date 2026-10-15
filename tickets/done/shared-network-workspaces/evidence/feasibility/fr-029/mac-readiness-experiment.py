# Native macOS bounded diagnosis, no models/auth/production changes.
import select
private='/Users/admin/.ab-sf-readiness-'+S
vmsh('umask 077; mkdir '+private)
upload=sp.run([T,'exec','-i',VM,'/bin/sh','-c','umask 077; cat > '+private+'/owner.py'],env=ENV,input=(P/'mac-readiness-owner.py').read_text(),capture_output=True,text=True,timeout=20)
assert upload.returncode==0,upload.stderr
cfg={'private':private,'mount':M,'source':vm_gateway+':'+pseudo,'server':vm_gateway,'port':relay_port,'storageId':storage_id}
parent=sp.Popen([T,'exec','-i',VM,'/usr/bin/python3','-u',private+'/owner.py',json.dumps(cfg)],env=ENV,stdin=sp.PIPE,stdout=sp.PIPE,stderr=sp.PIPE,text=True)
receipts=[];paused=False
def receive():
    assert select.select([parent.stdout],[],[],5)[0],'Mac owner receipt timed out'
    line=parent.stdout.readline();assert line,'Mac owner exited'
    row=json.loads(line);receipts.append(row);R['macReadinessReceipts']=receipts;save();return row
def command(action,**kw):
    parent.stdin.write(json.dumps({'action':action,**kw})+'\n');parent.stdin.flush();return receive()
try:
    init=receive();assert init['event']=='READY' and init['uid']==501,init
    def healthy():
        r=command('check')['result'];assert r['status']=='READY' and r['actualStorageId']==storage_id and r['alive']==0 and r['seconds']<2,r
        return {'node':VM,**r}
    case('native Mac readiness uses expected source and isolated exact-storage UUID child',healthy)
    def rejected():
        rows=[]
        for override,status in [({'storageId':'wrong'},'WRONG_STORAGE'),({'source':'127.0.0.1:/wrong'},'WRONG_MOUNT_SOURCE'),({'mount':private},'MISSING_MOUNT')]:
            r=command('check',override=override)['result'];assert r['status']==status and r['seconds']<2,r;rows.append(r)
        vmsh('printf PRESERVED_LOCAL > '+private+'/local.txt')
        assert vmsh('cat '+private+'/local.txt').stdout=='PRESERVED_LOCAL'
        return {'node':VM,'checks':rows,'privateLocalBytesPreserved':True}
    case('native Mac rejects wrong UUID/source and unmounted local directory without substitute access',rejected)
    def permission():
        name='/fresh-denied-'+uuid.uuid4().hex
        d('exec',server,'python3','-c',"import os,json;p='/export' + "+repr(name)+";open(p,'w').write("+repr(json.dumps({'storageId':storage_id}))+ ");os.chown(p,0,0);os.chmod(p,0)")
        r=command('check',override={'identityPath':name})['result'];assert r['status']=='PERMISSION_DENIED',r
        return {'node':VM,'freshNeverWarmedObject':True,**r}
    case('native Mac fresh permission denial is distinguished from readiness',permission)
    def unavailable():
        global paused
        before=command('state');d('pause',server);paused=True;rows=[]
        for _ in range(3):
            r=command('check')['result'];assert r['status']=='UNAVAILABLE' and r['seconds']<1.2 and r['starts']==before['starts'],r;rows.append(r)
        after=command('state');assert after['heartbeats']>before['heartbeats'] and after['alive']==0,(before,after)
        d('unpause',server);paused=False
        return {'node':VM,'checks':rows,'localHeartbeatAdvanced':True,'noFileChildrenStarted':True}
    case('native Mac paused-service diagnoses within bounded TCP deadline without new file children',unavailable)
    def race():
        global paused
        name='/fresh-race-'+uuid.uuid4().hex
        d('exec',server,'python3','-c',"import json;open('/export'+"+repr(name)+",'w').write("+repr(json.dumps({'storageId':storage_id}))+ ")")
        assert command('rpc')['result']['ok']
        d('pause',server);paused=True
        r=command('check',prechecked=True,override={'identityPath':name})['result'];assert r['status']=='INDETERMINATE' and r['code']=='FILESYSTEM_PROBE_DEADLINE' and r['seconds']<2,r
        again=command('check')['result'];state_now=command('state')
        if state_now['alive']:
            assert again.get('code')=='PREVIOUS_CHILD_NOT_EXITED' and again['starts']==r['starts'],again
        # An observed exit permits reuse; a sent signal alone does not.
        d('unpause',server);paused=False
        for _ in range(80):
            s=command('state')
            if not s['alive']:break
            time.sleep(.1)
        else:raise AssertionError('exact Mac child did not exit after service restore')
        recovered=command('check')['result'];assert recovered['status']=='READY' and recovered['alive']==0,recovered
        return {'node':VM,'deadline':r,'subsequent':again,'afterRestore':recovered,'exactChildExitObserved':True,'noBoundedKernelSyscallClaim':True}
    case('native Mac RPC-to-file outage race returns indeterminate; retains exact child ownership until exit and recovers',race)
finally:
    if paused:d('unpause',server,check=False)
    if parent.poll() is None:
        try:parent.stdin.write('{"action":"close"}\n');parent.stdin.flush();out,err=parent.communicate(timeout=15)
        except sp.TimeoutExpired:parent.kill();out,err=parent.communicate(timeout=10)
    else:out,err=parent.communicate(timeout=5)
    R['macReadinessParentCleanup']={'rc':parent.returncode,'stderr':err,'tail':out};save()
    vmsh('/bin/rm -rf '+private,check=False)
    assert parent.returncode==0,R['macReadinessParentCleanup']
R['uncovered']=['production Mac inspector and all admission/action/lifecycle paths','protected immutable identity and write-readiness final contract','normal user OS approval/complete guided setup/rerun/restart/detach','physical LAN','current source/UI/independent final validation'];save()
