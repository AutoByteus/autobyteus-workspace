from pathlib import Path
import sys,copy
E=Path(__file__).resolve().parent;MODE=sys.argv[1];RESULT=MODE+'-both-create-result.json';exec((E/('common-docker.py' if MODE=='LD' else 'common.py')).read_text())
one=json.loads((E/('docker-selected-create-v2-result.json' if MODE=='LD' else 'selected-create-result.json')).read_text());assert one['result']=='Pass'
assert json.loads((E/('docker-single-detach-result.json' if MODE=='LD' else 'native-detach-result.json')).read_text())['result']=='Pass'
r['mode']=MODE;r['connectionBefore']=one['connection'];r['sourceIdentityBefore']=one['sourceIdentityBefore'];ip=one['endpoint'];q=shlex.quote;nodes=['autobyteus-server-0','autobyteus-server-1']
def inspect():return json.loads(g('sudo -n docker inspect '+' '.join(nodes))['stdout'])
def hashes(n):return g('sudo -n docker exec '+n+' sha256sum /root/.codex/api007-sentinel /home/autobyteus/data/api007-sentinel /home/vncuser/.config/chromium/api007-sentinel')['stdout']
def compare(a,b):
 assert a['Id']!=b['Id'] and a['Image']==b['Image'] and b['State']['Running']
 ac=copy.deepcopy(a['Config']);bc=copy.deepcopy(b['Config'])
 for x in [ac,bc]:
  x.pop('Image')
  for k in ['com.autobyteus.nfs.storageId','com.autobyteus.nfs.recreation']:x['Labels'].pop(k,None)
 assert ac==bc
 ah=copy.deepcopy(a['HostConfig']);bh=copy.deepcopy(b['HostConfig'])
 for x in [ah,bh]:
  x['Mounts']=[m for m in x.get('Mounts',[]) or [] if m['Target'] not in [ROOT,'/etc/autobyteus-nfs']]
  if x.get('OomKillDisable') is None:x['OomKillDisable']=False
  if x.get('Dns') is None:x['Dns']=[]
 assert ah==bh,{'changedHostConfig':[k for k in ah if ah[k]!=bh.get(k)]}
 assert a['NetworkSettings']['Ports']==b['NetworkSettings']['Ports']
 def mounts(x):return sorted([m for m in x['Mounts'] if m['Destination'] not in [ROOT,'/etc/autobyteus-nfs']],key=lambda m:m['Destination'])
 assert mounts(a)==mounts(b);assert set(a['NetworkSettings']['Networks'])==set(b['NetworkSettings']['Networks'])
 for net in a['NetworkSettings']['Networks']:
  def aliases(x):return [v for v in x['NetworkSettings']['Networks'][net].get('Aliases') or [] if v not in [x['Id'],x['Id'][:12]]]
  assert aliases(a)==aliases(b)
try:
 case('L06 '+MODE+' explicit start both local nodes before operator-approved selection',lambda:g('sudo -n docker start '+' '.join(nodes),timeout=90))
 def healthy():
  for n in nodes:
   for i in range(50):
    z=g('sudo -n docker exec '+n+" node -e "+q("fetch('http://127.0.0.1:8000/rest/health').then(r=>{if(!r.ok)process.exit(1);return r.text()}).then(console.log).catch(()=>process.exit(1))"),check=False,timeout=10)
    if z['rc']==0:break
    time.sleep(2)
   else:raise RuntimeError('server unhealthy '+n)
  return {'bothHealth':'Pass'}
 case('L03 '+MODE+' both real application nodes healthy before selection',healthy)
 if MODE=='LN':
  code='set -e; mkdir -p /root/.codex; printf API007_B_SYNTHETIC_NO_CREDENTIAL > /root/.codex/api007-sentinel; printf API007_B_PRIVATE_DATA > /home/autobyteus/data/api007-sentinel; printf API007_B_BROWSER_PROFILE > /home/vncuser/.config/chromium/api007-sentinel; chmod 600 /root/.codex/api007-sentinel'
  g('sudo -n docker exec '+nodes[1]+' sh -c '+q(code))
 r['before']=inspect();r['privateHashes']={n:hashes(n) for n in nodes};save()
 def create():
  z=nongroups(B+' create --source '+SRC+' --backend '+('ganesha-docker' if MODE=='LD' else 'ganesha-native')+' --endpoint '+ip+' --allow '+ip+' --nodes '+','.join(nodes)+' --yes --drained --json',timeout=240)
  v=json.loads(z['stdout']);assert v['status']['hostReady'] and all(v['status']['nodes'][n].startswith('ready;') for n in nodes);assert v['connection']['storageId']==one['connection']['storageId'];r['connection']=v['connection'];save();return z
 case('L06 '+MODE+' fresh public create A+B preserved source UUID',create)
 def proof():
  after=inspect();r['after']=after;save()
  for a,b,n in zip(r['before'],after,nodes):compare(a,b);assert hashes(n)==r['privateHashes'][n]
  s=json.loads(snapshot()['stdout']);assert s['sourceMarker']==s['mountedMarker']=={'storageId':r['connection']['storageId']};assert s['sourceHash']==s['mountedHash']==hashlib.sha256(b'ORIGINAL_API007').hexdigest()
  return {'bothNodesPreserved':True,'source':s}
 case('L06 '+MODE+' both configuration private image network volume and source preservation',proof)
 case('L06 '+MODE+' both actual application health after NFS selection',healthy)
 r['result']='Pass';save()
except BaseException as x:r['result']='Fail';r['fatal']=repr(x);save();raise
