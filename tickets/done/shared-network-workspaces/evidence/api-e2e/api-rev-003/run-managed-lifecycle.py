from pathlib import Path
import json,subprocess as sp,time,shlex,hashlib,copy
E=Path(__file__).resolve().parent;p=E/'run-linux-docker-public.py';s=p.read_text().split('try:\n case(')[0].replace('linux-docker-public-result.json','managed-lifecycle-result.json');exec(s)
prior=json.loads((E/'linux-managed-client-confirm-result.json').read_text());assert prior['result']=='Pass';prep=json.loads((E/'managed-nodes-restricted-result.json').read_text());assert json.loads((E/'desktop-validation-result.json').read_text())['tunnelCleanup']['absent'];node=prep['selected'];r['connection']=prior['connection'];r['sourceIdentityBefore']=prior['sourceIdentityBefore'];before=prior['after'];UUID=r['connection']['storageId'];save()
def inspect(n):return json.loads(g('sudo -n docker inspect '+n)['stdout'])[0]
def ready(window=150):
 end=time.monotonic()+window
 while time.monotonic()<end:
  try:
   q=g('curl --max-time 3 -fsS http://127.0.0.1:8001/rest/health; findmnt -n -o FSTYPE '+ROOT,check=False,timeout=6)
   if q.get('rc')==0 and 'nfs4' in q['stdout']:
    status=nongroups(B+' status --yes --json',check=False,timeout=10)
    if status.get('rc')==0:
     v=json.loads(status['stdout'])
     if v['hostReady'] and v['nodes'][node].startswith('ready;'):return {'signals':q,'status':status}
    elif 'another administrative operation' not in status.get('stderr',''):raise RuntimeError('Public status failed: '+status.get('stderr',''))
  except sp.TimeoutExpired:pass
  time.sleep(2)
 raise RuntimeError('No healthy automatic managed node and host readiness within observation window; no reconnect performed')
def preserved(detached=False):
 after=inspect(node);old=copy.deepcopy(before['Config']);new=copy.deepcopy(after['Config'])
 for c in [old,new]:
  c.pop('Image',None)
  for k in ['com.autobyteus.nfs.recreation','com.autobyteus.nfs.storageId']:c['Labels'].pop(k,None)
 assert old==new;assert after['Image']==before['Image'];assert after['State']['Running'];assert after['NetworkSettings']['Ports']==before['NetworkSettings']['Ports'];assert after['NetworkSettings']['Networks']['api003-clients']['Aliases']==['api003-primary']
 a=sorted([m for m in after['Mounts'] if m['Destination'] not in [ROOT,'/etc/autobyteus-nfs']],key=lambda m:m['Destination']);b=sorted(prep['before']['Mounts'],key=lambda m:m['Destination']);assert a==b
 q=g('sudo -n docker exec '+node+' sha256sum /root/.codex/api003-sentinel /home/autobyteus/data/api003-sentinel /home/vncuser/.config/chromium/api003-sentinel');assert q['stdout']==prep['privateHashes']
 other=inspect(prep['unselected']);assert other['Id']==prep['unselectedBefore']['Id'] and other['Config']==prep['unselectedBefore']['Config'] and other['HostConfig']==prep['unselectedBefore']['HostConfig'] and not other['State']['Running']
 if detached:assert not any(m['Destination'] in [ROOT,'/etc/autobyteus-nfs'] for m in after['Mounts']);assert 'com.autobyteus.nfs.storageId' not in after['Config']['Labels']
 else:assert after['Id']==before['Id'] and after['Config']==before['Config'] and after['HostConfig']==before['HostConfig']
 return {'node':after,'privateHashes':q,'unselected':other}
try:
 case('normal selected Docker node restart',lambda:g('sudo -n docker restart '+node,timeout=60));case('same node automatically healthy after Docker restart',ready);case('Docker restart preserves exact image node config private mounts ports aliases and unselected node',preserved)
 boot=g('cat /proc/sys/kernel/random/boot_id')['stdout'].strip();r['beforeRebootBootID']=boot;save()
 def reboot():
  try:g('sudo -n systemctl reboot',check=False,timeout=10)
  except sp.TimeoutExpired:pass
  end=time.monotonic()+150
  while time.monotonic()<end:
   try:
    q=g('cat /proc/sys/kernel/random/boot_id',check=False,timeout=5)
    if q.get('rc')==0 and q['stdout'].strip()!=boot:break
   except sp.TimeoutExpired:pass
   time.sleep(2)
  else:raise RuntimeError('No guest reboot observed')
  return {'newBootID':q['stdout'].strip(),'readiness':ready()}
 case('normal whole guest reboot restores host and selected managedDocker client without reconnect',reboot);case('whole guest reboot preserves selected node and unselected stopped state',preserved)
 q=snapshot();v=json.loads(q['stdout']);assert v['sourceHash']==v['mountedHash']==hashlib.sha256(b'ORIGINAL_API003').hexdigest() and v['sourceMarker']==v['mountedMarker']=={'storageId':UUID};r['postbootIdentity']=q;save()
 case('public drained detach selected client and Docker storage',lambda:nongroups(B+' detach --yes --drained --json',timeout=120));case('detach retains chosen actual image private config bytes volumes ports and alias',lambda:preserved(True))
 q=g('set -e; ! findmnt -n -t nfs,nfs4 '+ROOT+'; test ! -e /etc/autobyteus-nfs/attachment.json; test ! -e /etc/systemd/system/autobyteus-nfs.service; cat '+SRC+'/.autobyteus-nfs/storage.json; sha256sum '+SRC+'/project/preexisting.txt; stat -c "%d:%i:%u:%g:%a" '+SRC+'; sudo -n docker volume inspect autobyteus-nfs-'+UUID+'; sudo -n docker ps -a --filter label=com.autobyteus.nfs.storageId='+UUID+' --format "{{.Names}}"');assert UUID in q['stdout'] and r['sourceIdentityBefore'] in q['stdout'];assert not g('sudo -n docker ps -a --filter label=com.autobyteus.nfs.storageId='+UUID+' --format "{{.Names}}"')['stdout'].strip();r['detachSourceVolumeEvidence']=q;r['result']='Pass';save();event('Managed Docker node restart/whole-guest reboot/actual readiness/normal drained detach and exact private-source preservation Pass; native backend selected-client rerun remains')
except BaseException as x:
 r['result']='Fail';r['fatal']=repr(x);save();event('Managed lifecycle Fail/incomplete '+repr(x))
 try:r['diagnostics']=g('sudo -n docker ps -a; sudo -n docker logs --tail 35 '+node+'; sudo -n journalctl -u autobyteus-nfs.service -b --no-pager -n 40; findmnt -t nfs,nfs4',check=False,timeout=20);save()
 except BaseException as y:r['diagnosticError']=repr(y);save()
print(json.dumps({'result':r['result'],'fatal':r.get('fatal')}),flush=True)
