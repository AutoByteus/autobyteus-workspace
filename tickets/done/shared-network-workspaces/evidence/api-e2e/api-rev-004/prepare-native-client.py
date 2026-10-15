from pathlib import Path
import json,subprocess as sp,time,shlex,hashlib,copy
E=Path(__file__).resolve().parent
exec((E/'run-linux-docker-public.py').read_text().split('try:\n case(')[0].replace('linux-docker-public-result.json','native-client-result.json'))
prior=json.loads((E/'native-peer-confirm-result.json').read_text());assert prior['nativeResult']=='Pass';SRC=prior['source'];B='/home/admin/'+V+'-native-binary';node='autobyteus-server-0';r.update(source=SRC,connection=prior['connection'],sourceIdentityBefore=prior['sourceIdentityBefore'])
def inspect(n):return json.loads(g('sudo -n docker inspect '+n)['stdout'])[0]
try:
 case('explicit start owned current node before native storage selection',lambda:g('sudo -n docker start '+node,timeout=60));old=inspect(node);other=inspect('autobyteus-server-1');r['before']=old;r['unselectedBefore']=other;save()
 q=case('public native create selects existing current managed Docker client',lambda:nongroups(B+' create --source '+SRC+' --backend ganesha-native --endpoint '+prior['endpoint']+' --allow '+prior['endpoint']+','+json.loads((E/'mac-peer-resource.json').read_text())['ip']+' --nodes '+node+' --yes --drained --json',timeout=180));v=json.loads(q['stdout']);assert v['connection']==r['connection'] and v['status']['hostReady'] and v['status']['nodes'][node].startswith('ready;');a=inspect(node);r['after']=a;save()
 ac=copy.deepcopy(a['Config']);bc=copy.deepcopy(old['Config'])
 for x in [ac,bc]:
  x.pop('Image',None)
  for k in ['com.autobyteus.nfs.storageId','com.autobyteus.nfs.recreation']:x['Labels'].pop(k,None)
 assert ac==bc and a['Image']==old['Image'];ah=copy.deepcopy(a['HostConfig']);bh=copy.deepcopy(old['HostConfig']);ah['Mounts']=[m for m in ah['Mounts'] if m['Target'] not in [ROOT,'/etc/autobyteus-nfs']];assert ah==bh
 u=inspect('autobyteus-server-1')
 for x in [u,other]:x['Mounts']=sorted(x['Mounts'],key=lambda m:m['Destination'])
 assert u==other
 q=snapshot();v=json.loads(q['stdout']);assert v['sourceHash']==v['mountedHash']==hashlib.sha256(b'ORIGINAL_API004').hexdigest() and v['sourceMarker']==v['mountedMarker']=={'storageId':r['connection']['storageId']};r['sourceProof']=q
 r['result']='Pass';save();event('Linux native-storage managedDocker client actual public admission and current private/source/config preservation Pass; no peer/physical claim')
except BaseException as x:r['result']='Fail';r['fatal']=repr(x);save();event('Native managed client Fail/incomplete '+repr(x))
print(json.dumps({'result':r['result'],'fatal':r.get('fatal')}),flush=True)
