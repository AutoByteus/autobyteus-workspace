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
