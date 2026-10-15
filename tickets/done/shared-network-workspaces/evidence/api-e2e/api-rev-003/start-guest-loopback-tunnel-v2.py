"""Own ephemeral SSH key + VM-read host key; only loopback forward, no host route/bridge changes."""
from pathlib import Path
import json,subprocess as sp,time,shlex,hashlib,socket,os,urllib.request
E=Path(__file__).resolve().parent;p=E/'run-linux-docker-public.py';s=p.read_text().split('try:\n case(')[0].replace('linux-docker-public-result.json','guest-loopback-tunnel-v2-result.json');exec(s)
r['result']='Preparing';save()
try:
 key=S/'api003-vm-ssh';assert key.is_file();pub=Path(str(key)+'.pub').read_bytes();r['publicKeySHA256']=hashlib.sha256(pub).hexdigest()
 r['existingKeyReceipt']='guest-loopback-tunnel-result.json';save()
 q=g('cat /etc/ssh/ssh_host_ed25519_key.pub; sudo -n systemctl is-active ssh.socket');hostkey=q['stdout'].splitlines()[0].split()[:2];ip=priorIp=json.loads((E/'linux-docker-public-result.json').read_text())['endpoint'];known=S/'api003-known-hosts';known.write_text(ip+' '+' '.join(hostkey)+'\n');r['hostKeySHA256']=hashlib.sha256(known.read_bytes()).hexdigest()
 with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
 base=['/usr/bin/ssh','-F','/dev/null','-i',str(key),'-o','IdentitiesOnly=yes','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','UserKnownHostsFile='+str(known),'-o','ConnectTimeout=10','-o','ExitOnForwardFailure=yes']
 args=[*base,'-N','-L','127.0.0.1:'+str(port)+':127.0.0.1:8001','admin@'+ip];f=(E/'guest-loopback-tunnel-v2.log').open('w');proc=sp.Popen(args,env=env,stdout=f,stderr=sp.STDOUT,start_new_session=True);r['pid']=proc.pid;r['argv']=args;r['baseUrl']='http://127.0.0.1:'+str(port);save()
 for i in range(30):
  if proc.poll() is not None:raise RuntimeError('Owned SSH tunnel exited: '+(E/'guest-loopback-tunnel-v2.log').read_text())
  try:
   with urllib.request.urlopen(r['baseUrl']+'/rest/health',timeout=2) as res:r['health']={'status':res.status,'body':res.read().decode()};assert res.status==200
   break
  except (OSError,TimeoutError):time.sleep(1)
 else:raise RuntimeError('Owned loopback HTTP forward not ready')
 r['result']='Ready';save();event('Host-to-owned-guest SSH loopback HTTP forwarding verified using own ephemeral key and guest-read host key; no VM peer route/bridge workaround')
except BaseException as x:r['result']='Incomplete';r['error']=repr(x);save();event('Owned loopback tunnel incomplete '+repr(x))
print(json.dumps({'result':r['result'],'error':r.get('error'),'baseUrl':r.get('baseUrl'),'pid':r.get('pid')}),flush=True)
