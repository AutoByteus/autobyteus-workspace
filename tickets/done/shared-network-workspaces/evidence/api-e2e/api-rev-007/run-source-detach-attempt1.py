from pathlib import Path
import sys,copy
E=Path(__file__).resolve().parent;MODE=sys.argv[1];RESULT=MODE+'-source-detach-result.json';exec((E/('common-docker.py' if MODE=='LD' else 'common.py')).read_text())
prior=json.loads((E/(MODE+'-both-create-result.json')).read_text());UUID=prior['connection']['storageId'];q=shlex.quote;nodes=['autobyteus-server-0','autobyteus-server-1'];r['mode']=MODE
def inspect():return json.loads(g('sudo -n docker inspect '+' '.join(nodes))['stdout'])
def reconnect():
 for i in range(15):
  z=nongroups(B+' reconnect --yes --json',check=False,timeout=90)
  if z['rc']==0:return z
  assert 'lock' in z['stderr'],z;time.sleep(1)
 raise RuntimeError('lifecycle lock not released')
try:
 r['bindingBefore']=g('sudo -n cat /var/lib/autobyteus-nfs/hosted-filesystem.json')['stdout'];r['sourceStat']=g('stat -c "%d:%i:%u:%g:%a" '+SRC)['stdout'];save()
 original=SRC+'-saved-'+MODE
 case('L21 '+MODE+' replace source pathname with actual new directory and copied marker',lambda:nongroups('set -e; mv '+SRC+' '+original+'; mkdir -m 755 '+SRC+'; mkdir '+SRC+'/.autobyteus-nfs; cp '+original+'/.autobyteus-nfs/storage.json '+SRC+'/.autobyteus-nfs/storage.json; stat -c "%d:%i:%u:%g:%a" '+SRC))
 def reject():
  z=nongroups(B+' reconnect --yes --json',check=False,timeout=60);assert z['rc']!=0 and any(x in (z['stdout']+z['stderr']).lower() for x in ['identity','source','changed']),z
  assert g('sudo -n cat /var/lib/autobyteus-nfs/hosted-filesystem.json')['stdout']==r['bindingBefore'];assert g('stat -c "%d:%i:%u:%g:%a" '+SRC)['stdout']!=r['sourceStat']
  return z
 case('L21 '+MODE+' public reconnect refuses copied-marker replacement without rebinding',reject)
 case('L21 '+MODE+' restore exact original source without copying data',lambda:nongroups('set -e; rm '+SRC+'/.autobyteus-nfs/storage.json; rmdir '+SRC+'/.autobyteus-nfs '+SRC+'; mv '+original+' '+SRC))
 assert g('stat -c "%d:%i:%u:%g:%a" '+SRC)['stdout']==r['sourceStat']
 case('L21 '+MODE+' restored original public reconnect and actual fresh status',lambda:[reconnect(),snapshot()])
 before=inspect();r['beforeDetach']=before;save()
 def refused_no_drain():
  z=nongroups(B+' detach --yes --json',check=False,timeout=30);assert z['rc']!=0 and 'drain' in (z['stderr']+z['stdout']).lower(),z
  after=inspect()
  for a,b in zip(before,after):assert a['Id']==b['Id'] and a['Config']==b['Config'] and a['HostConfig']==b['HostConfig'] and b['State']['Running']
  return z
 case('L25 '+MODE+' no-drain public detach refusal leaves both running unchanged',refused_no_drain)
 case('L25 '+MODE+' actual controlled drain stops both nodes',lambda:g('sudo -n docker stop '+' '.join(nodes),timeout=90))
 # Hold a real host process cwd on the native mount. This makes ordinary umount busy.
 holder='/home/admin/api007-busy-'+MODE
 py="import os,time,pathlib;os.chdir("+repr(ROOT)+");pathlib.Path("+repr(holder)+").write_text(str(os.getpid()));time.sleep(180)"
 g('nohup python3 -c '+q(py)+' >/home/admin/api007-busy-'+MODE+'.log 2>&1 < /dev/null &')
 for i in range(30):
  z=g('cat '+holder,check=False)
  if z['rc']==0:break
  time.sleep(.1)
 pid=int(z['stdout']);r['busyPid']=pid;save()
 def busy():
  z=nongroups(B+' detach --yes --drained --json',check=False,timeout=60);assert z['rc']!=0 and any(x in (z['stderr']+z['stdout']).lower() for x in ['busy','in use']),z
  assert UUID in g('cat '+SRC+'/.autobyteus-nfs/storage.json')['stdout']
  return z
 try:case('L25 '+MODE+' busy mount refused without forced/lazy unmount',busy)
 finally:g('kill -TERM '+str(pid)+'; rm '+holder)
 case('L25 '+MODE+' after real drain public detach completes',lambda:nongroups(B+' detach --yes --drained --json',timeout=120))
 def preserved():
  after=inspect();r['afterDetach']=after;save()
  for a,b,n in zip(before,after,nodes):
   assert not b['State']['Running'] and a['Image']==b['Image']
   ac=copy.deepcopy(a['Config']);bc=copy.deepcopy(b['Config'])
   for x in [ac,bc]:
    x.pop('Image')
    for k in ['com.autobyteus.nfs.storageId','com.autobyteus.nfs.recreation']:x['Labels'].pop(k,None)
   assert ac==bc
   ah=copy.deepcopy(a['HostConfig']);bh=copy.deepcopy(b['HostConfig'])
   for x in [ah,bh]:
    x['Mounts']=[m for m in x.get('Mounts',[]) or [] if m['Target'] not in [ROOT,'/etc/autobyteus-nfs']]
    if x.get('Dns') is None:x['Dns']=[]
    if x.get('OomKillDisable') is None:x['OomKillDisable']=False
   assert ah==bh,{'changed':[k for k in ah if ah[k]!=bh.get(k)]}
   old={m['Destination']:m for m in a['Mounts'] if m['Destination'] not in [ROOT,'/etc/autobyteus-nfs']};new={m['Destination']:m for m in b['Mounts']};assert old==new
   paths={k:m['Source'] for k,m in new.items()};files=[paths['/root']+'/.codex/api007-sentinel',paths['/home/autobyteus/data']+'/api007-sentinel',paths['/home/vncuser/.config/chromium']+'/api007-sentinel']
   h=g('sudo -n sha256sum '+' '.join(map(q,files)))['stdout'];assert [v.split()[0] for v in h.splitlines()]==[v.split()[0] for v in prior['privateHashes'][n].splitlines()]
  z=g('set -e; ! grep -E " nfs4? " /proc/mounts; sudo -n test ! -e /etc/autobyteus-nfs/attachment.json; sudo -n test ! -e /etc/systemd/system/autobyteus-nfs.service; cat '+SRC+'/.autobyteus-nfs/storage.json; sha256sum '+SRC+'/project/preexisting.txt; stat -c "%d:%i:%u:%g:%a" '+SRC+'; sudo -n docker volume inspect autobyteus-nfs-'+UUID)
  assert UUID in z['stdout'] and r['sourceStat'].strip() in z['stdout'] and hashlib.sha256(b'ORIGINAL_API007').hexdigest() in z['stdout']
  assert not g('sudo -n docker ps -a --filter label=com.autobyteus.nfs.storageId='+UUID+' --format "{{.Names}}"')['stdout'].strip()
  return {'privateConfigSourcePreserved':True,'remainingVolumeAndOriginalSource':z,'after':after}
 case('L25 '+MODE+' both node local config private volumes source marker retained and owned attachment absent',preserved)
 r['result']='Pass';save()
except BaseException as x:r['result']='Fail';r['fatal']=repr(x);save();raise
