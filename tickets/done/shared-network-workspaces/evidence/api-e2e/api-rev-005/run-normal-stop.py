"""Serial ordinary successfully-running unless-stopped Stop; no outage injection."""
from pathlib import Path
import json,subprocess as sp,time,shlex,hashlib,copy
E=Path(__file__).resolve().parent
exec((E/'run-two-reboots.py').read_text().split('try:\n for i in [1,2]:')[0].replace('two-reboots-result.json','normal-stop-result.json'))
assert json.loads((E/'two-reboots-result.json').read_text())['result']=='Pass'
setup=json.loads((E/'managed-client-image-result.json').read_text());launcher=setup['launcherRoot']+'/scripts/public/docker/autobyteus-docker.sh';home='/home/admin/api005-launcher-home'
def attempt_hash():return g('sudo -n sh -c '+shlex.quote('for f in /var/lib/autobyteus-nfs/start-attempt-*.json; do test ! -e "$f" || sha256sum "$f"; done'))['stdout']
def stopped():
 current=inspect(node);assert current['Id']==before['Id'] and current['Config']==before['Config'] and current['Image']==before['Image'];assert not current['State']['Running'] and current['State']['Error']=='' and current['HostConfig']['RestartPolicy']['Name']=='unless-stopped';hc=hostconfig_equal(before['HostConfig'],current['HostConfig'])
 other=inspect(prep['unselected']);assert other['Id']==prep['unselectedBefore']['Id'] and not other['State']['Running'];assert attempt_hash()==r['attemptHashAfterStop']
 q=nongroups(B+' status --yes --json',timeout=20);v=json.loads(q['stdout']);assert v['hostReady'] and v['nodes'][node].startswith('stopped:')
 return {'selected':current,'hostConfig':hc,'unselected':other,'status':q}
try:
 case('ordinary actual healthy state before Stop',ready);assert inspect(node)['HostConfig']['RestartPolicy']['Name']=='unless-stopped'
 q=case('current public launcher Stop on successfully running selected node',lambda:g('sudo -n /usr/bin/env -i HOME='+home+' PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin /bin/bash '+launcher+' stop --name '+node,timeout=60));assert 'restart policy were kept' in q['stdout'];r['attemptHashAfterStop']=attempt_hash();save()
 case('ordinary Stop state and read-only status',stopped)
 event('Observe two existing30-second service ticks after normal Stop');time.sleep(65);case('normal Stop preserved across service ticks',stopped)
 case('confirmed public reconnect does not override normal Stop',lambda:nongroups(B+' reconnect --yes --json',timeout=60));case('normal Stop preserved after confirmed reconnect',stopped)
 old=g('cat /proc/sys/kernel/random/boot_id')['stdout'].strip()
 try:g('sudo -n systemctl reboot',check=False,timeout=10)
 except sp.TimeoutExpired:pass
 end=time.monotonic()+150
 while time.monotonic()<end:
  try:
   q=g('cat /proc/sys/kernel/random/boot_id',check=False,timeout=5)
   if q['rc']==0 and q['stdout'].strip()!=old:break
  except sp.TimeoutExpired:pass
  time.sleep(2)
 else:raise RuntimeError('No reboot observed')
 r['boot']={'old':old,'new':q['stdout'].strip()};save();time.sleep(65)
 case('normal unless-stopped Stop remains stopped after whole-host reboot and ticks',stopped)
 r['result']='Pass';save();event('Normal-running Stop / ticks / confirmed reconnect / ordinary reboot veto PASS. No failed-stop policy control inferred.')
except BaseException as x:r['result']='Fail';r['fatal']=repr(x);save();event('Normal Stop control Fail/incomplete '+repr(x))
print(json.dumps({'result':r['result'],'fatal':r.get('fatal')}),flush=True)
