"""Serial operator controls on a captured natural Docker boot failure.
The attachment job is held ONLY for this control, not the two automatic boots.
No storage outage or fabricated Docker state. Missing natural refusal is unproven.
"""
from pathlib import Path
import json,subprocess as sp,time,shlex,hashlib,copy
E=Path(__file__).resolve().parent
exec((E/'run-two-reboots.py').read_text().split('try:\n for i in [1,2]:')[0].replace('two-reboots-result.json','policy-veto-result.json'))
assert json.loads((E/'normal-stop-result.json').read_text())['result']=='Pass'
setup=json.loads((E/'managed-client-image-result.json').read_text());launcher=setup['launcherRoot']+'/scripts/public/docker/autobyteus-docker.sh';home='/home/admin/api004-launcher-home'
def attempt_hash():return g('sudo -n sh -c '+shlex.quote('for f in /var/lib/autobyteus-nfs/start-attempt-*.json; do test ! -e "$f" || sha256sum "$f"; done'))['stdout']
def reboot_only():
 old=g('cat /proc/sys/kernel/random/boot_id')['stdout'].strip()
 try:g('sudo -n systemctl reboot',check=False,timeout=10)
 except sp.TimeoutExpired:pass
 end=time.monotonic()+150
 while time.monotonic()<end:
  try:
   q=g('cat /proc/sys/kernel/random/boot_id',check=False,timeout=5)
   if q['rc']==0 and q['stdout'].strip()!=old:return {'old':old,'new':q['stdout'].strip()}
  except sp.TimeoutExpired:pass
  time.sleep(2)
 raise RuntimeError('No reboot observed')
def veto_proof():
 current=inspect(node);assert current['Id']==before['Id'] and current['Image']==before['Image'] and current['Config']==before['Config'];assert not current['State']['Running'] and current['HostConfig']['RestartPolicy']=={'Name':'no','MaximumRetryCount':0}
 expected=copy.deepcopy(before['HostConfig']);expected['RestartPolicy']={'Name':'no','MaximumRetryCount':0};hc=hostconfig_equal(expected,current['HostConfig'])
 assert sorted(current['Mounts'],key=lambda m:m['Destination'])==sorted(before['Mounts'],key=lambda m:m['Destination']);assert attempt_hash()==r['attemptHashBeforeVeto']
 other=inspect(prep['unselected']);assert other['Id']==prep['unselectedBefore']['Id'] and not other['State']['Running']
 q=nongroups(B+' status --yes --json',timeout=20);v=json.loads(q['stdout']);assert v['hostReady'] and v['nodes'][node].startswith('stopped: current restart policy')
 return {'node':current,'hostConfig':hc,'unselected':other,'status':q}
try:
 case('control only: hold owned attachment completion job for serial failed-start inspection',lambda:g('sudo -n systemctl disable --now autobyteus-nfs.service',timeout=60))
 case('explicit user Start of normally stopped node to prepare distinct policy control',lambda:g('sudo -n docker start '+before['Id'],timeout=60));case('control starts from genuinely running healthy selected node',ready)
 case('ordinary reboot with attachment job held for serial operator inspection',reboot_only)
 time.sleep(30);failed=inspect(node);r['capturedFailedStart']=failed;save()
 volume=json.loads(g('sudo -n docker volume inspect autobyteus-nfs-'+UUID)['stdout'])[0];r['volume']=volume;save();data=volume['Options']['o'].replace(',rw,',',',1);mp=volume['Mountpoint'];expected="error while mounting volume '%s': failed to mount local volume: mount %s:%s, data: %s: connection refused"%(mp,volume['Options']['device'],mp,data)
 assert failed['Id']==before['Id'] and failed['State']['Status']=='exited' and not failed['State']['Running'] and failed['State']['Pid']==0 and failed['State']['Error']==expected, 'No qualified natural refused boot start captured; no forced outage permitted'
 r['attemptHashBeforeVeto']=attempt_hash();save();event('Captured real ordinary Docker NFS pre-process connection-refused start; job held, no synthetic state')
 q=case('raw Stop on already-failed node is a Docker no-op',lambda:g('sudo -n docker stop '+before['Id'],timeout=30));after=inspect(node);assert after['State']==failed['State'] and after['Id']==failed['Id'];r['afterRawStop']=after;save()
 q=case('current launcher reports no-op/policy guidance, not cancellation promise',lambda:g('sudo -n /usr/bin/env -i HOME='+home+' PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin /bin/bash '+launcher+' stop --name '+node,timeout=30));assert 'already-failed/non-running node is a no-op' in q['stdout'] and 'docker update --restart=no' in q['stdout'];assert inspect(node)['State']==failed['State']
 case('operator explicitly selects current restart=no durable veto',lambda:g('sudo -n docker update --restart=no '+before['Id']))
 case('restore original owned attachment service with existing configuration',lambda:g('sudo -n systemctl enable --now autobyteus-nfs.service',timeout=60));time.sleep(65)
 case('policy=no suppresses automatic completion while host becomes ready',veto_proof)
 case('confirmed public reconnect cannot override current policy=no',lambda:nongroups(B+' reconnect --yes --json',timeout=60));case('policy veto exact stopped-state preservation after explicit reconnect',veto_proof)
 case('ordinary reboot after durable veto with original attachment job enabled',reboot_only);time.sleep(65);case('policy=no remains veto across reboot and service ticks',veto_proof)
 r['result']='Pass';save();event('Captured failed-start raw Stop no-op/guidance and current restart=no automatic/explicit/reboot veto PASS')
except BaseException as x:
 r['result']='Fail';r['fatal']=repr(x);save();event('Policy control Fail/incomplete '+repr(x))
 try:r['diagnostics']=g('sudo -n docker inspect '+node+'; sudo -n systemctl is-enabled autobyteus-nfs.service; sudo -n systemctl is-active autobyteus-nfs.service; sudo -n journalctl -b -u autobyteus-nfs.service -u docker.service --no-pager -n 100',check=False,timeout=20);save()
 except BaseException as y:r['diagnosticError']=repr(y);save()
print(json.dumps({'result':r['result'],'fatal':r.get('fatal')}),flush=True)
