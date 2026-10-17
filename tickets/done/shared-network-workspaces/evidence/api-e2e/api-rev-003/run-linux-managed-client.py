"""Public selected-node create through actual Docker API/image/module/health boundaries."""
from pathlib import Path
import json,subprocess as sp,time,shlex,hashlib,copy
E=Path(__file__).resolve().parent;p=E/'run-linux-docker-public.py';s=p.read_text().split('try:\n case(')[0].replace('linux-docker-public-result.json','linux-managed-client-result.json');exec(s)
prep=json.loads((E/'managed-nodes-restricted-result.json').read_text());assert prep['result']=='Ready';node=prep['selected'];prior=json.loads((E/'linux-docker-public-result.json').read_text());r['sourceIdentityBefore']=prior['sourceIdentityBefore'];r['serverImage']=prep['serverImage'];r['node']=node;save()
def inspect(n):return json.loads(g('sudo -n docker inspect '+n)['stdout'])[0]
def private():return g('sudo -n docker exec '+node+' sha256sum /root/.codex/api003-sentinel /home/autobyteus/data/api003-sentinel /home/vncuser/.config/chromium/api003-sentinel')['stdout']
def preservation():
 before=prep['before'];after=inspect(node);r['after']=after;save();assert after['Id']!=before['Id'];assert after['Image']==before['Image'];assert after['State']['Running']
 ac=copy.deepcopy(after['Config']);bc=copy.deepcopy(before['Config']);assert ac.pop('Image')==before['Image'];bc.pop('Image')
 for k in ['com.autobyteus.nfs.storageId','com.autobyteus.nfs.recreation']:ac['Labels'].pop(k,None)
 assert ac==bc,{'configChangedKeys':[k for k in ac if ac[k]!=bc.get(k)]}
 ah=copy.deepcopy(after['HostConfig']);bh=copy.deepcopy(before['HostConfig']);extra=ah.pop('Mounts',[]);old=bh.pop('Mounts',[]) or [];filtered=[m for m in extra if m['Target'] not in [ROOT,'/etc/autobyteus-nfs']];assert filtered==old;assert ah==bh,{'hostConfigChangedKeys':[k for k in ah if ah[k]!=bh.get(k)]}
 oldMounts=[{k:m.get(k) for k in ['Type','Name','Source','Destination','RW','Propagation']} for m in before['Mounts']]
 afterMounts=[{k:m.get(k) for k in ['Type','Name','Source','Destination','RW','Propagation']} for m in after['Mounts'] if m['Destination'] not in [ROOT,'/etc/autobyteus-nfs']];assert afterMounts==oldMounts
 assert after['NetworkSettings']['Ports']==before['NetworkSettings']['Ports'];assert set(after['NetworkSettings']['Networks'])==set(before['NetworkSettings']['Networks'])
 for net,info in before['NetworkSettings']['Networks'].items():
  expected=[a for a in info.get('Aliases') or [] if a not in [before['Id'],before['Id'][:12]]];actual=[a for a in after['NetworkSettings']['Networks'][net].get('Aliases') or [] if a not in [after['Id'],after['Id'][:12]]];assert actual==expected,(net,actual,expected)
 assert private()==prep['privateHashes'];assert inspect(prep['unselected'])==prep['unselectedBefore'];return {'configHostConfigImagePrivateVolumesSentinelsPortsAliases':'Pass','unselectedExactSnapshot':'Pass','oldContainer':before['Id'],'newContainer':after['Id']}
try:
 q=case('public create with exact chosen managed Docker client',lambda:nongroups(B+' create --source '+SRC+' --backend ganesha-docker --endpoint '+prior['endpoint']+' --allow '+prior['endpoint']+' --nodes '+node+' --yes --drained --json',timeout=180));v=json.loads(q['stdout']);assert v['status']['hostReady'] and v['status']['nodes'][node].startswith('ready;');assert v['connection']['storageId']==prior['connection']['storageId'];r['connection']=v['connection'];save()
 case('exact chosen image config private state ports aliases and unselected preservation',preservation)
 def identity():
  q=snapshot();v=json.loads(q['stdout']);assert v['sourceHash']==v['mountedHash']==hashlib.sha256(b'ORIGINAL_API003').hexdigest();assert v['sourceMarker']==v['mountedMarker']=={'storageId':r['connection']['storageId']};assert ':'.join(map(str,v['sourceIdentity'][:4]))+':'+oct(v['sourceIdentity'][4])[2:]==r['sourceIdentityBefore'];return q
 case('same original nonempty source and native mount identity preserved',identity)
 q=case('public reconnect with real managed node readiness',lambda:nongroups(B+' reconnect --yes --json',timeout=60));v=json.loads(q['stdout']);assert v['hostReady'] and v['nodes'][node].startswith('ready;');assert inspect(node)['Id']==r['after']['Id'];assert private()==prep['privateHashes']
 r['result']='Pass';save();event('Linux managedDocker client create/reconnect exact preservation Pass; mounted file/API journeys next, not Mac/physical/paid-native proof')
except BaseException as x:
 r['result']='Fail';r['fatal']=repr(x);save();event('ManagedDocker client Fail/incomplete '+repr(x))
 try:r['diagnostics']=g('sudo -n docker ps -a; sudo -n ls -l /var/lib/autobyteus-nfs; sudo -n journalctl -u autobyteus-nfs.service --no-pager -n 40',check=False,timeout=20);save()
 except BaseException as y:r['diagnosticError']=repr(y);save()
print(json.dumps({'result':r['result'],'fatal':r.get('fatal')}),flush=True)
