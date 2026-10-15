"""Public selected-node create through actual Docker API/image/module/health boundaries."""
from pathlib import Path
import json,subprocess as sp,time,shlex,hashlib,copy
E=Path(__file__).resolve().parent; RESULT='docker-selected-confirm-result.json'; exec((E/'common-docker.py').read_text())
prep=json.loads((E/'managed-nodes-prepare-result.json').read_text());assert prep['result']=='Ready';node=prep['selected'];r['serverImage']=prep['serverImage'];r['node']=node;save()
def inspect(n):return json.loads(g('sudo -n docker inspect '+n)['stdout'])[0]
def private():return g('sudo -n docker exec '+node+' sha256sum /root/.codex/api005-sentinel /home/autobyteus/data/api005-sentinel /home/vncuser/.config/chromium/api005-sentinel')['stdout']
def preservation():
 before=prep['before'];after=inspect(node);r['after']=after;save();assert after['Id']!=before['Id'];assert after['Image']==before['Image'];assert after['State']['Running']
 ac=copy.deepcopy(after['Config']);bc=copy.deepcopy(before['Config']);assert ac.pop('Image')==before['Image'];bc.pop('Image')
 for k in ['com.autobyteus.nfs.storageId','com.autobyteus.nfs.recreation']:ac['Labels'].pop(k,None);bc['Labels'].pop(k,None)
 assert ac==bc,{'configChangedKeys':[k for k in ac if ac[k]!=bc.get(k)]}
 ah=copy.deepcopy(after['HostConfig']);bh=copy.deepcopy(before['HostConfig']);extra=ah.pop('Mounts',[]);old=bh.pop('Mounts',[]) or [];filtered=[m for m in extra if m['Target'] not in [ROOT,'/etc/autobyteus-nfs']];assert filtered==old;assert ah==bh,{'hostConfigChangedKeys':[k for k in ah if ah[k]!=bh.get(k)]}
 oldMounts=[{k:m.get(k) for k in ['Type','Name','Source','Destination','RW','Propagation']} for m in before['Mounts']]
 afterMounts=[{k:m.get(k) for k in ['Type','Name','Source','Destination','RW','Propagation']} for m in after['Mounts'] if m['Destination'] not in [ROOT,'/etc/autobyteus-nfs']];assert len({m["Destination"] for m in afterMounts})==len(afterMounts);assert sorted(afterMounts,key=lambda m:m["Destination"])==sorted(oldMounts,key=lambda m:m["Destination"])
 assert after['NetworkSettings']['Ports']==before['NetworkSettings']['Ports'];assert set(after['NetworkSettings']['Networks'])==set(before['NetworkSettings']['Networks'])
 for net,info in before['NetworkSettings']['Networks'].items():
  expected=[a for a in info.get('Aliases') or [] if a not in [before['Id'],before['Id'][:12]]];actual=[a for a in after['NetworkSettings']['Networks'][net].get('Aliases') or [] if a not in [after['Id'],after['Id'][:12]]];assert actual==expected,(net,actual,expected)
 assert private()==prep['privateHashes'];u=inspect(prep['unselected']);o=copy.deepcopy(prep['unselectedBefore']);u['Mounts']=sorted(u['Mounts'],key=lambda x:x['Destination']);o['Mounts']=sorted(o['Mounts'],key=lambda x:x['Destination']);assert u==o;return {'configHostConfigImagePrivateVolumesSentinelsPortsAliases':'Pass','unselectedExactSnapshot':'Pass','oldContainer':before['Id'],'newContainer':after['Id']}
original=json.loads((E/'docker-selected-create-result.json').read_text());assert original['cases'][2]['status']=='Pass'
prep=original['preparedCurrent'];r.update(connection=original['connection'],sourceIdentityBefore=original['sourceIdentityBefore'],endpoint=original['endpoint'],setupEvidence='docker-selected-create-result.json, successful public create NOT repeated',harnessCorrection='Compare both sides excluding only owned recreation/storage labels; prior native detach leaves an expected recreation label')
try:
 case('exact preservation after already successful public Docker setup',preservation)
 q=snapshot();v=json.loads(q['stdout']);assert v['sourceHash']==v['mountedHash']==hashlib.sha256(b'ORIGINAL_API005').hexdigest();assert v['sourceMarker']==v['mountedMarker']=={'storageId':r['connection']['storageId']};assert ':'.join(map(str,v['sourceIdentity'][:4]))+':'+oct(v['sourceIdentity'][4])[2:]==r['sourceIdentityBefore'];r['sourceProof']=q
 q=g('sha256sum /usr/libexec/autobyteus-nfs/autobyteus-nfs; sudo -n systemctl is-active autobyteus-nfs.service');assert build['binary']['sha256'] in q['stdout'];r['installedProof']=q
 r['result']='Pass';save();event('Docker public setup and exact preservation confirmed; harness asymmetric label exclusion corrected, no repeat mutation')
except BaseException as x:r['result']='Fail';r['fatal']=repr(x);save();event('Docker confirmation Fail/incomplete '+repr(x))
