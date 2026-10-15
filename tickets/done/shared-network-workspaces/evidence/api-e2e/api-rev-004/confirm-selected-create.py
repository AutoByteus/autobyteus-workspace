"""Public selected-node create through actual Docker API/image/module/health boundaries."""
from pathlib import Path
import json,subprocess as sp,time,shlex,hashlib,copy
E=Path(__file__).resolve().parent;p=E/'run-linux-docker-public.py';s=p.read_text().split('try:\n case(')[0].replace('linux-docker-public-result.json','selected-create-confirm-result.json');exec(s)
prep=json.loads((E/'managed-nodes-prepare-result.json').read_text());assert prep['result']=='Ready';node=prep['selected'];r['serverImage']=prep['serverImage'];r['node']=node;save()
def inspect(n):return json.loads(g('sudo -n docker inspect '+n)['stdout'])[0]
def private():return g('sudo -n docker exec '+node+' sha256sum /root/.codex/api004-sentinel /home/autobyteus/data/api004-sentinel /home/vncuser/.config/chromium/api004-sentinel')['stdout']
def preservation():
 before=prep['before'];after=inspect(node);r['after']=after;save();assert after['Id']!=before['Id'];assert after['Image']==before['Image'];assert after['State']['Running']
 ac=copy.deepcopy(after['Config']);bc=copy.deepcopy(before['Config']);assert ac.pop('Image')==before['Image'];bc.pop('Image')
 for k in ['com.autobyteus.nfs.storageId','com.autobyteus.nfs.recreation']:ac['Labels'].pop(k,None)
 assert ac==bc,{'configChangedKeys':[k for k in ac if ac[k]!=bc.get(k)]}
 ah=copy.deepcopy(after['HostConfig']);bh=copy.deepcopy(before['HostConfig']);extra=ah.pop('Mounts',[]);old=bh.pop('Mounts',[]) or [];filtered=[m for m in extra if m['Target'] not in [ROOT,'/etc/autobyteus-nfs']];assert filtered==old;assert ah==bh,{'hostConfigChangedKeys':[k for k in ah if ah[k]!=bh.get(k)]}
 oldMounts=[{k:m.get(k) for k in ['Type','Name','Source','Destination','RW','Propagation']} for m in before['Mounts']]
 afterMounts=[{k:m.get(k) for k in ['Type','Name','Source','Destination','RW','Propagation']} for m in after['Mounts'] if m['Destination'] not in [ROOT,'/etc/autobyteus-nfs']];assert len({m["Destination"] for m in afterMounts})==len(afterMounts);assert sorted(afterMounts,key=lambda m:m["Destination"])==sorted(oldMounts,key=lambda m:m["Destination"])
 assert after['NetworkSettings']['Ports']==before['NetworkSettings']['Ports'];assert set(after['NetworkSettings']['Networks'])==set(before['NetworkSettings']['Networks'])
 for net,info in before['NetworkSettings']['Networks'].items():
  expected=[a for a in info.get('Aliases') or [] if a not in [before['Id'],before['Id'][:12]]];actual=[a for a in after['NetworkSettings']['Networks'][net].get('Aliases') or [] if a not in [after['Id'],after['Id'][:12]]];assert actual==expected,(net,actual,expected)
 assert private()==prep['privateHashes'];other=inspect(prep['unselected']);expected=copy.deepcopy(prep['unselectedBefore']);other['Mounts']=sorted(other['Mounts'],key=lambda m:m['Destination']);expected['Mounts']=sorted(expected['Mounts'],key=lambda m:m['Destination']);assert other==expected;return {'configHostConfigImagePrivateVolumesSentinelsPortsAliases':'Pass','unselectedExactSnapshot':'Pass','oldContainer':before['Id'],'newContainer':after['Id']}
try:
 original=json.loads((E/'selected-create-result.json').read_text());assert original['cases'][1]['status']=='Pass';r['connection']=original['connection'];r['sourceIdentityBefore']=original['sourceIdentityBefore'];r['endpoint']=original['endpoint'];r['createEvidence']='selected-create-result.json (first and only public create)';save()
 case('exact chosen image config private state ports aliases and unselected preservation',preservation)
 def identity():
  q=snapshot();v=json.loads(q['stdout']);assert v['sourceHash']==v['mountedHash']==hashlib.sha256(b'ORIGINAL_API004').hexdigest();assert v['sourceMarker']==v['mountedMarker']=={'storageId':r['connection']['storageId']};assert ':'.join(map(str,v['sourceIdentity'][:4]))+':'+oct(v['sourceIdentity'][4])[2:]==r['sourceIdentityBefore'];return q
 case('same original nonempty source and native mount identity preserved',identity)
 q=case('installed identity private modes and active managed job',lambda:g('set -e; sha256sum /usr/libexec/autobyteus-nfs/autobyteus-nfs; sudo -n systemctl is-active autobyteus-nfs.service; sudo -n find /var/lib/autobyteus-nfs -maxdepth 1 -printf "%m %u %g %f\\n"'));assert build['binary']['sha256'] in q['stdout'];r['privateModeEvidence']=q
 r['result']='Pass';save();event('Fresh selected public create Pass; no reconnect performed; ordinary two whole-host reboots next')
except BaseException as x:
 r['result']='Fail';r['fatal']=repr(x);save();event('ManagedDocker client Fail/incomplete '+repr(x))
 try:r['diagnostics']=g('sudo -n docker ps -a; sudo -n ls -l /var/lib/autobyteus-nfs; sudo -n journalctl -u autobyteus-nfs.service --no-pager -n 40',check=False,timeout=20);save()
 except BaseException as y:r['diagnosticError']=repr(y);save()
print(json.dumps({'result':r['result'],'fatal':r.get('fatal')}),flush=True)
