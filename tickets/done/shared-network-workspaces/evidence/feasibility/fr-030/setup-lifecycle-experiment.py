# Designer-owned lifecycle feasibility, not the final guided product command.
# All targets/containers/configuration are fresh owned fixtures; no credentials/models.
import plistlib
private='/Users/admin/.ab-sf-lifecycle-'+S
vmsh('umask 077; mkdir '+private)
label='org.autobyteus.feasibility.'+S
job='/Library/LaunchDaemons/'+label+'.plist'
helper='/usr/local/libexec/'+label+'.sh'
installed=False;node_recreated=False
def repeat():
    before=vmsh('/sbin/mount').stdout
    # A matching native mount is reused, not mounted again or a local replacement.
    assert vm_gateway+':'+pseudo+' on '+M+' (nfs' in before
    identity=json.loads(vmsh('/bin/cat '+M+'/.owned-identity/storage.json').stdout)
    assert identity['storageId']==storage_id
    after=vmsh('/sbin/mount').stdout;assert before==after
    return {'node':VM,'mountCount':after.count(' on '+M+' ('),'reusedExpectedStorage':True,'noNewMountCommand':True}
case('repeat setup-state check reuses one existing native mount and expected storage',repeat)
def occupied():
    target=private+'/occupied';vmsh('mkdir '+target+'; printf KEEP_EXISTING > '+target+'/existing.txt')
    r=vmsh('test -z "$(ls -A '+target+')"',check=False)
    assert r.returncode!=0
    # Detection precedes any privileged mount call.
    assert vmsh('cat '+target+'/existing.txt').stdout=='KEEP_EXISTING'
    assert ' on '+target+' (' not in vmsh('/sbin/mount').stdout
    return {'node':VM,'rejectNonemptyTarget':True,'bytesPreserved':True,'privilegedMountNotAttempted':True}
case('owned nonempty mount location is refused without hiding existing data',occupied)
def denied():
    target=private+'/unprivileged';vmsh('mkdir '+target)
    r=vmsh('/sbin/mount -t nfs -o vers=4.1,port='+str(relay_port)+' '+vm_gateway+':'+pseudo+' '+target,check=False)
    assert r.returncode!=0 and ' on '+target+' (' not in vmsh('/sbin/mount').stdout
    return {'node':VM,'nativeUserMountExit':r.returncode,'stderr':r.stderr,'reportedReady':False,'notRealUserPasswordDialogProof':True}
case('native unprivileged mounting fails truthfully without administrator authorization',denied)
def declined():
    before=d('inspect','--format','{{.Id}} {{.State.Status}} {{.Image}}',a['name']).stdout
    # Fixture consent=false means no stop/remove/recreate command is issued.
    after=d('inspect','--format','{{.Id}} {{.State.Status}} {{.Image}}',a['name']).stdout
    assert before==after
    return {'node':a['name'],'consent':False,'sameContainerRunning':True,'noDisruptionCommand':True,'notImplementedPromptProof':True}
case('declined fixture Docker disruption leaves the selected owned node unchanged',declined)
def recreate():
    global node_recreated
    name=a['name'];token='PRIVATE_'+uuid.uuid4().hex
    d('exec',name,'sh','-c','printf '+token+' > /home/autobyteus/data/lifecycle-marker; printf '+token+' > /root/lifecycle-private-marker; printf '+token+' > /home/autobyteus/workspace/lifecycle-marker')
    initial=json.loads(d('inspect',name).stdout)[0]
    assert initial['Config']['Image']==APP_IMAGE
    mounts={m['Destination']:m['Name'] for m in initial['Mounts'] if m['Type']=='volume'}
    assert len(mounts)==6,mounts
    d('stop','--time','15',name);d('rm',name)
    args=['--network',network,'--cap-add','SYS_ADMIN','--security-opt','seccomp=unconfined','-p',f"127.0.0.1:{a['port']}:8000"]
    for e in ['AUTOBYTEUS_WORKSPACE_ROOT=/app','AUTOBYTEUS_DATA_DIR=/home/autobyteus/data','AUTOBYTEUS_BIND_HOST=0.0.0.0','AUTOBYTEUS_SERVER_PORT=8000','APP_ENV=production','DB_TYPE=sqlite','LOG_LEVEL=INFO','AUTOBYTEUS_SKIP_SYNC=1','AUTOBYTEUS_TEMP_WORKSPACE_DIR=/home/autobyteus/workspace']:
        args+=['-e',e]
    for dest,vol in mounts.items():args+=['--mount',f'type=volume,src={vol},dst={dest}'+(',volume-nocopy' if dest==M else '')]
    # Use the immutable pre-existing image; no pull/upgrade/reset/replacement volume.
    d('run','-d','--name',name,'--label','org.autobyteus.probe=fr-030',*args,APP_IMAGE);node_recreated=True
    for _ in range(90):
        try:gql(a['port'],'query{__typename}');break
        except Exception:time.sleep(1)
    else:raise AssertionError('recreated own backend not ready')
    current=json.loads(d('inspect',name).stdout)[0]
    assert current['Id']!=initial['Id'] and current['Image']==initial['Image']
    assert mounts=={m['Destination']:m['Name'] for m in current['Mounts'] if m['Type']=='volume'}
    actual=d('exec',name,'sh','-c','cat /home/autobyteus/data/lifecycle-marker /root/lifecycle-private-marker /home/autobyteus/workspace/lifecycle-marker').stdout
    assert actual==token*3,actual
    assert content(a,filename)==vmsh('cat '+ROOT+'/'+filename).stdout
    return {'node':name,'originalContainerId':initial['Id'],'newContainerId':current['Id'],'sameImage':initial['Image'],'samePort':a['port'],'exactSixVolumesPreserved':mounts,'privateMarkersPreserved':True,'normalPersistedWorkspaceStillUsable':True,'noSourceUserNodeOrLoginTouched':True,'notArbitraryUserConfigReconstructionProof':True}
case('approved owned Docker recreation preserves immutable image, port, six mounts and private state',recreate)
try:
    def restart():
        global installed
        options='vers=4.1,tcp,hard,actimeo=1,retrycnt=0,port='+str(relay_port)
        # Minimal root job is disposable experimental mechanism, not final helper architecture.
        script='#!/bin/sh\nset -eu\n/sbin/mount | /usr/bin/grep -F " on '+M+' (nfs" >/dev/null && exit 0\n[ -d '+M+' ] || /bin/mkdir '+M+'\n[ -z "$(/bin/ls -A '+M+')" ] || exit 3\nexec /sbin/mount -t nfs -o '+options+' '+vm_gateway+':'+pseudo+' '+M+'\n'
        definition={'Label':label,'ProgramArguments':[helper],'RunAtLoad':True,'StandardOutPath':'/var/tmp/'+label+'.out','StandardErrorPath':'/var/tmp/'+label+'.err'}
        for basename,data in [('helper.sh',script),('job.plist',plistlib.dumps(definition).decode())]:
            r=sp.run([T,'exec','-i',VM,'/bin/sh','-c','umask 077; cat > '+private+'/'+basename],env=ENV,input=data,text=True,capture_output=True,timeout=20);assert r.returncode==0,r.stderr
        vmsh('sudo -n mkdir -p /usr/local/libexec; sudo -n install -m 0755 '+private+'/helper.sh '+helper+'; sudo -n install -m 0644 '+private+'/job.plist '+job)
        installed=True
        vmsh('sudo -n launchctl bootstrap system '+job)
        before=vmsh('/usr/sbin/sysctl -n kern.boottime').stdout
        # Native reboot, with storage service and raw TCP transport left running.
        r=vt('exec',VM,'/usr/bin/sudo','-n','/sbin/shutdown','-r','now',check=False);R['rebootCommandRc']=r.returncode;save()
        started=time.monotonic();last=None
        for _ in range(90):
            time.sleep(2)
            try:
                r=vt('exec',VM,'/usr/sbin/sysctl','-n','kern.boottime',timeout=4,check=False)
                if r.returncode==0 and r.stdout!=before:
                    actual=vmsh('/bin/cat '+M+'/.owned-identity/storage.json',timeout=5).stdout
                    if json.loads(actual)['storageId']==storage_id:break
            except Exception as e:last=repr(e)
        else:raise AssertionError(('native reboot/reconnect',last))
        ip=vmsh('/usr/sbin/ipconfig getifaddr en0').stdout.strip();assert ip==vm_ip,(ip,vm_ip)
        output=vmsh('/sbin/mount; sudo -n launchctl print system/'+label).stdout
        assert output.count(' on '+M+' (nfs')==1 and 'last exit code = 0' in output,output
        value=content(b,filename);assert vmsh('/bin/cat '+ROOT+'/'+filename).stdout==value
        return {'node':VM,'beforeBoot':before,'afterBoot':r.stdout,'seconds':round(time.monotonic()-started,3),'automaticNativeRemountWithExpectedUUID':True,'mountCount':1,'guestAddressUnchanged':True,'noPostRebootMountCommand':True,'notRealUserInstallApprovalOrOfflineRestartProof':True}
    case('native Mac reboot automatically remounts same storage through owned system job and normal file reads',restart)
finally:
    if installed:
        vmsh('sudo -n launchctl bootout system/'+label,check=False)
        q=vmsh('sudo -n rm -f '+job+' '+helper+' /var/tmp/'+label+'.out /var/tmp/'+label+'.err; test ! -e '+job+'; test ! -e '+helper,check=False)
        R['ownedSystemJobCleanup']={'rc':q.returncode,'label':label,'job':job,'helper':helper};save()
    vmsh('/bin/rm -rf '+private,check=False)
R['uncovered']=['complete product guided setup/distribution/security/join owner','actual user OS consent/password path','initial local-to-network selected node mount application and arbitrary existing configuration','unavailable service at login or changing client addresses','busy-detach/full cancellation rollback','physical LAN/current source/UI/independent validation'];save()
