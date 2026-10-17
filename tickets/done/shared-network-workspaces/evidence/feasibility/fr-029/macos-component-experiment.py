# Native macOS filesystem and two Linux public file APIs, not instructed agents.
import hashlib
storage_id=uuid.uuid4().hex
nodejs(a['name'],f"const f=require('fs');f.mkdirSync({json.dumps(M+'/.owned-identity')},{{recursive:true}});f.writeFileSync({json.dumps(M+'/.owned-identity/storage.json')},{json.dumps(json.dumps({'storageId':storage_id}))})")
start_relay()
def mount_mac():
    global vm_created_mount
    vmsh('test ! -e '+M+'; sudo -n /bin/mkdir '+M)
    options='vers=4.1,tcp,hard,actimeo=1,retrycnt=0,port='+str(relay_port)
    vmsh('sudo -n /sbin/mount -t nfs -o '+options+' '+vm_gateway+':'+pseudo+' '+M,timeout=30)
    vm_created_mount=True
    output=vmsh('/sbin/mount; /bin/cat '+M+'/.owned-identity/storage.json').stdout
    assert storage_id in output and ' on '+M+' (' in output and 'nfs' in output,output
    return {'node':VM,'path':M,'source':vm_gateway+':'+pseudo,'options':options,'mountAndIdentity':output,'guestAdminOnly':True,'samePhysicalHost':True}
case('native macOS guest mounts the same Linux export and reads its independent storage identity',mount_mac)

filename='macos-three-client.txt';x='MAC_NATIVE_'+uuid.uuid4().hex+'\n';y='LINUX_NODE_B_'+uuid.uuid4().hex+'\n'
def assert_files(expected):
    started=time.monotonic();samples=[]
    while time.monotonic()-started<5:
        values=[content(n,filename) for n in nodes]
        mac=vmsh('/bin/cat '+ROOT+'/'+filename).stdout
        backing=d('exec',server,'cat','/export/project/'+filename).stdout
        elapsed=time.monotonic()-started
        samples.append({'seconds':round(elapsed,3),'macMatches':mac==expected,'linuxMatches':[v==expected for v in values],'backingMatches':backing==expected})
        if all(v==expected for v in values) and mac==backing==expected:
            assert elapsed<=5, samples
            return {'macNode':VM,'linuxNodes':[n['name'] for n in nodes],'path':ROOT+'/'+filename,'sha256':hashlib.sha256(expected.encode()).hexdigest(),'seconds':round(elapsed,3),'freshOpenSamples':samples,'contractSeconds':5}
        time.sleep(.2)
    raise AssertionError(samples)
def mac_write():
    vmsh("printf '%s' '"+x+"' > "+ROOT+'/'+filename+'; /bin/sync')
    return assert_files(x)
case('normal unprivileged macOS file write is read through both registered Linux workspace APIs',mac_write)
def linux_modify():
    write(b,filename,x+y)
    return assert_files(x+y)
case('Linux application file modification is freshly read through native macOS mount and peer API',linux_modify)
def mac_replace():
    z='MAC_REPLACED_'+uuid.uuid4().hex+'\n'
    vmsh("printf '%s' '"+z+"' > "+ROOT+'/'+filename+'.new; /bin/sync; /bin/mv '+ROOT+'/'+filename+'.new '+ROOT+'/'+filename)
    return assert_files(z)
case('native macOS same-filesystem replacement publishes ordinary project bytes to both Linux nodes',mac_replace)
def ordinary_ops():
    code="cd "+ROOT+" && /bin/ln -s "+filename+" relative.link && /bin/cat relative.link && printf '#!/bin/sh\\nprintf EXECUTABLE_OK\\\\n\\n' > runnable.sh && /bin/chmod 0755 runnable.sh"
    vmsh(code)
    executable=nodejs(b['name'],f"const cp=require('child_process'),f=require('fs');console.log(JSON.stringify({{link:f.readlinkSync({json.dumps(ROOT+'/relative.link')}),run:cp.execFileSync({json.dumps(ROOT+'/runnable.sh')},{{encoding:'utf8'}})}}))")
    result=json.loads(executable);assert result['link']==filename and 'EXECUTABLE_OK' in result['run'],result
    return {'node':VM,'peer':b['name'],'relativeSymlink':result['link'],'executableResult':result['run']}
case('Mac-created relative symlink and executable mode are usable by Linux ordinary CLI',ordinary_ops)
def exclusive():
    nodejs(a['name'],f"require('fs').writeFileSync({json.dumps(ROOT+'/exclusive.txt')},'original',{{flag:'wx'}})")
    r=vmsh('cd '+ROOT+"; (set -C; printf replacement > exclusive.txt)",check=False)
    assert r.returncode!=0
    actual=vmsh('/bin/cat '+ROOT+'/exclusive.txt').stdout;assert actual=='original'
    return {'macNode':VM,'linuxWriter':a['name'],'macExclusiveCreateExit':r.returncode,'originalBytesPreserved':True}
case('Mac exclusive creation rejects file already created by independent Linux client',exclusive)
R['uncovered']=['Mac AutoByteus application and actual native model-agent journeys','Git ownership/default trust and Mac/Linux locking','binary/concurrent/outage/macOS readiness/lifecycle','complete guided one-command setup/normal host OS approval','physical multi-computer LAN','current-source/review/delivery']
R['hostMacMount']=False;R['nativeMacGuestProviderCredentials']=False;save()
