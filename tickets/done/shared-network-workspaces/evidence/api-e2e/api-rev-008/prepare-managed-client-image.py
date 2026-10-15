from pathlib import Path
import json,subprocess as sp,time,shlex,hashlib
E=Path(__file__).resolve().parent; RESULT='managed-client-image-result.json'; exec((E/'common.py').read_text())
r['result']='WaitingForBuild';save();tag='ab-nfs-api008-server:current'
try:
 deadline=time.monotonic()+1200
 while time.monotonic()<deadline:
  b=json.loads((E/'server-build-v2-result.json').read_text())
  if b['result']=='Ready':break
  if b['result'] not in ['Building','Preparing']:raise RuntimeError('Current image build did not pass')
  time.sleep(5)
 else:raise RuntimeError('Current image build still incomplete')
 r['hostImage']=b['image'][0]['Id'];save()
 args=['/usr/local/bin/docker','save',tag];other=[tart,'exec','-i',V,'sudo','-n','docker','load'];r['transferArgv']=[args,other];save();start=time.monotonic()
 with (E/'server-image-transfer.log').open('wb') as log:
  exporter=sp.Popen(args,stdout=sp.PIPE,stderr=log);importer=sp.Popen(other,env=env,stdin=exporter.stdout,stdout=log,stderr=log);exporter.stdout.close();r['transferPids']=[exporter.pid,importer.pid];save()
  try:
   irc=importer.wait(timeout=900);erc=exporter.wait(timeout=20)
  except BaseException:
   importer.terminate();exporter.terminate();importer.wait(timeout=15);exporter.wait(timeout=15);raise
 r['transferResult']={'exportRc':erc,'importRc':irc,'seconds':round(time.monotonic()-start,3)};save();assert erc==irc==0
 q=g('sudo -n docker image inspect '+tag);im=json.loads(q['stdout'])[0];assert im['Id']==r['hostImage'];r['guestImage']=im;save()
 # Loopback registry only; no public image publication. Current source launcher always pulls.
 q=g('set -e; sudo -n docker tag '+tag+' 127.0.0.1:5000/ab-nfs-api008-server:current; sudo -n docker push 127.0.0.1:5000/ab-nfs-api008-server:current',timeout=600)
 q=g('sudo -n docker image inspect 127.0.0.1:5000/ab-nfs-api008-server:current');im=json.loads(q['stdout'])[0];digest=[d for d in im['RepoDigests'] if d.startswith('127.0.0.1:5000/ab-nfs-api008-server@')][0];r['guestRegistryDigest']=digest
 data=sp.check_output(['git','archive','HEAD','--','scripts/public/docker']);r['launcherArchiveSHA256']=hashlib.sha256(data).hexdigest();r['launcherRoot']='/home/admin/api008-launcher-source';cmd(['exec','-i',V,'/bin/sh','-c','mkdir -p '+r['launcherRoot']+'; tar -xf - -C '+r['launcherRoot']],data=data)
 # Test-owned guest only: normal Docker default host binding protects newly created launcher ports.
 q=g('set -e; test ! -e /etc/docker/daemon.json; printf \'{"ip":"127.0.0.1","default-network-opts":{"bridge":{"com.docker.network.bridge.host_binding_ipv4":"127.0.0.1"}}}\\n\' | sudo -n tee /etc/docker/daemon.json; sudo -n systemctl restart docker; sudo -n docker start ab-nfs-api008-registry; mkdir -m 700 /home/admin/api008-launcher-home',timeout=60);r['loopbackSafety']=q
 r['result']='Ready';save();event('Current full-source server image built/transferred unchanged to owned Linux guest; local registry digest, isolated launcher home, loopback port policy ready')
except BaseException as x:r['result']='Incomplete';r['error']=repr(x);save();event('Managed-client image setup incomplete '+repr(x))
print(json.dumps({'result':r['result'],'error':r.get('error'),'digest':r.get('guestRegistryDigest')}),flush=True)
