"""Focused ordinary machine-reboot reproduction; manual start is diagnostic restoration,
not a qualifying recovery. Never edits product/configuration/network/client options."""
from pathlib import Path
import json,subprocess as sp,time,shlex,hashlib
E=Path(__file__).resolve().parent
exec((E/'run-linux-docker-public.py').read_text().split('try:\n case(')[0].replace('linux-docker-public-result.json','managed-reboot-repro-result.json'))
node='autobyteus-server-0'
def ins():return json.loads(g('sudo -n docker inspect '+node)['stdout'])[0]
def observation():
 return {'node':ins(),'status':nongroups(B+' status --yes --json',check=False,timeout=20),'api':g('curl --max-time 3 -fsS http://127.0.0.1:8001/rest/health',check=False,timeout=5)}
try:
 r['beforeDiagnostic']=observation();save()
 assert not r['beforeDiagnostic']['node']['State']['Running']
 r['normalPublicReconnect']=nongroups(B+' reconnect --yes --json',timeout=60);r['afterReconnect']=observation();save()
 assert not r['afterReconnect']['node']['State']['Running']
 r['diagnosticOnlyStart']=g('sudo -n docker start '+node,timeout=60);save()
 end=time.monotonic()+90
 while time.monotonic()<end:
  q=observation()
  if q['api']['rc']==0 and json.loads(q['status']['stdout'])['nodes'][node].startswith('ready;'):break
  time.sleep(2)
 else:raise RuntimeError('Diagnostic start did not restore healthy node')
 r['beforeSecondReboot']=q;assert q['node']['Id']==r['beforeDiagnostic']['node']['Id'];assert q['node']['Config']==r['beforeDiagnostic']['node']['Config'];assert q['node']['HostConfig']==r['beforeDiagnostic']['node']['HostConfig'];assert q['node']['HostConfig']['RestartPolicy']['Name']=='unless-stopped';r['beforeBoot']=g('cat /proc/sys/kernel/random/boot_id')['stdout'].strip();save()
 try:g('sudo -n systemctl reboot',check=False,timeout=10)
 except sp.TimeoutExpired:pass
 end=time.monotonic()+120
 while time.monotonic()<end:
  try:
   q=g('cat /proc/sys/kernel/random/boot_id',check=False,timeout=5)
   if q.get('rc')==0 and q['stdout'].strip()!=r['beforeBoot']:break
  except sp.TimeoutExpired:pass
  time.sleep(2)
 else:raise RuntimeError('Reboot not observed')
 r['afterBoot']=q['stdout'].strip();save();observations=[];start=time.monotonic()
 while time.monotonic()-start<150:
  try:
   q=observation();q['sinceBootObservationSeconds']=round(time.monotonic()-start,3);observations.append(q);r['observations']=observations;save()
   if q['api']['rc']==0 and json.loads(q['status']['stdout'])['nodes'][node].startswith('ready;'):
    r['result']='Not Reproduced';break
  except (sp.TimeoutExpired,ValueError):pass
  time.sleep(10)
 else:r['result']='Reproduced';r['journeyResult']='Fail'
 r['afterSecondReboot']=observation();r['sourceAndMount']=snapshot();r['journal']=g('sudo -n journalctl -b -u docker -u containerd -u autobyteus-nfs.service --no-pager -o short-precise; sudo -n docker logs --timestamps --tail 40 autobyteus-nfs-storage-419ae1b8-6aad-45bc-9bf0-614c48f57d58',timeout=30);save()
 print(json.dumps({'result':r['result'],'state':r['afterSecondReboot']['node']['State'],'status':r['afterSecondReboot']['status']['stdout']}),flush=True)
except BaseException as x:r['result']='Incomplete';r['fatal']=repr(x);save();print(r['fatal'],flush=True)
