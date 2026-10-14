"""Test fixture safety repair: exact owned launcher nodes, restrict published bindings only.
No NFS command has run against either node. Preserve initial setup refusal separately.
"""
from pathlib import Path
import json,subprocess as sp,time,shlex,hashlib
E=Path(__file__).resolve().parent;p=E/'run-linux-docker-public.py';s=p.read_text().split('try:\n case(')[0].replace('linux-docker-public-result.json','managed-nodes-restricted-result.json');exec(s)
prep=json.loads((E/'managed-nodes-prepare-result.json').read_text());assert prep['result']=='Incomplete';r['predecessor']='managed-nodes-prepare-result.json';r['fixtureCorrection']='Docker daemon default ip did not constrain published bindings; exact owned nodes recreated via Docker API with explicit 127.0.0.1, image/config/volumes unchanged';r['selected']=prep['selected'];r['unselected']=prep['unselected'];r['serverImage']=prep['serverImage'];save()
try:
 g('sudo -n docker stop '+r['selected']+' '+r['unselected'],timeout=60)
 code='''import http.client,socket,json,urllib.parse,copy
class Unix(http.client.HTTPConnection):
 def connect(self):self.sock=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM);self.sock.connect('/var/run/docker.sock')
def call(method,path,data=None):
 c=Unix('localhost');c.request(method,'/v1.47'+path,body=None if data is None else json.dumps(data),headers={'content-type':'application/json'});r=c.getresponse();b=r.read();assert r.status<300,(r.status,b);return json.loads(b) if b else None
out=[]
for name in ['autobyteus-server-0','autobyteus-server-1']:
 old=call('GET','/containers/'+name+'/json');assert old['Config']['Labels']['com.autobyteus.launcher']=='server-docker' and not old['State']['Running']
 payload=copy.deepcopy(old['Config']);payload['Image']=old['Image'];host=copy.deepcopy(old['HostConfig'])
 for bindings in host['PortBindings'].values():
  for b in bindings:b['HostIp']='127.0.0.1'
 payload['HostConfig']=host;networks={}
 for n,v in old['NetworkSettings']['Networks'].items():
  e={k:v[k] for k in ['IPAMConfig','DriverOpts','GwPriority'] if v.get(k) is not None}
  if v.get('Aliases'):e['Aliases']=[a for a in v['Aliases'] if a not in [old['Id'],old['Id'][:12]]]
  networks[n]=e
 payload['NetworkingConfig']={'EndpointsConfig':networks}
 call('POST','/containers/'+old['Id']+'/rename?name='+name+'-api003-fixture-original')
 for n in networks:call('POST','/networks/'+n+'/disconnect',{'Container':old['Id'],'Force':False})
 new=call('POST','/containers/create?name='+name,payload)['Id']
 if name=='autobyteus-server-0':call('POST','/containers/'+new+'/start')
 call('DELETE','/containers/'+old['Id']+'?v=false&force=false')
 out.append({'name':name,'old':old['Id'],'new':new})
print(json.dumps(out))
'''
 r['recreation']=g('sudo -n python3 -c '+shlex.quote(code),timeout=120)
 for i in range(45):
  q=g('sudo -n docker exec '+r['selected']+' node --input-type=module -e '+shlex.quote("const r=await fetch('http://127.0.0.1:8000/rest/health');if(!r.ok)process.exit(1);console.log(await r.text())"),check=False,timeout=15)
  if q['rc']==0:break
  time.sleep(2)
 else:raise RuntimeError('Server health did not become ready')
 r['before']=json.loads(g('sudo -n docker inspect '+r['selected'])['stdout'])[0];r['unselectedBefore']=json.loads(g('sudo -n docker inspect '+r['unselected'])['stdout'])[0]
 for bindings in r['before']['NetworkSettings']['Ports'].values():assert bindings and all(b['HostIp']=='127.0.0.1' for b in bindings),bindings
 assert not r['unselectedBefore']['State']['Running']
 r['privateHashes']=g('sudo -n docker exec '+r['selected']+' sha256sum /root/.codex/api003-sentinel /home/autobyteus/data/api003-sentinel /home/vncuser/.config/chromium/api003-sentinel')['stdout']
 r['result']='Ready';save();event('Managed node fixture corrected before NFS: explicit loopback published bindings verified, current image/launcher private volumes retained; unselected stopped')
except BaseException as x:r['result']='Incomplete';r['error']=repr(x);save();event('Fixture safety correction incomplete '+repr(x))
print(json.dumps({'result':r['result'],'error':r.get('error')}),flush=True)
