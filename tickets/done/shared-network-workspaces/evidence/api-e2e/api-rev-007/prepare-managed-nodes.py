"""Actual current launcher, private guest HOME/volumes, synthetic-only private sentinels."""
from pathlib import Path
import subprocess as sp,json,time,shlex,hashlib
E=Path(__file__).resolve().parent; RESULT='managed-nodes-prepare-result.json'; exec((E/'common.py').read_text())
setup=json.loads((E/'managed-client-image-result.json').read_text());assert setup['result']=='Ready';image=setup['guestRegistryDigest'];launcher=setup['launcherRoot']+'/scripts/public/docker/autobyteus-docker.sh';home='/home/admin/api007-launcher-home';r['result']='Preparing';r['serverImage']=setup['hostImage'];save()
def launch():return g('sudo -n /usr/bin/env -i HOME='+home+' PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin /bin/bash '+launcher+' new-container --image '+image,timeout=180)
try:
 assert not g('sudo -n docker ps -a --filter label=com.autobyteus.launcher=server-docker --format "{{.Names}}"')['stdout'].strip()
 case('actual current launcher first ordinary node',launch)
 q=g('sudo -n docker ps -a --filter label=com.autobyteus.launcher=server-docker --format "{{.Names}}"');r['selected']=q['stdout'].strip();assert r['selected']=='autobyteus-server-0'
 def health():
  for i in range(45):
   q=g('sudo -n docker exec '+r['selected']+' node --input-type=module -e '+shlex.quote("const r=await fetch('http://127.0.0.1:8000/rest/health');if(!r.ok)process.exit(1);console.log(await r.text())"),check=False,timeout=15)
   if q['rc']==0:return q
   time.sleep(2)
  raise RuntimeError('Current product server did not become healthy')
 case('real server health before NFS selection',health)
 case('actual current launcher second unselected node',launch);r['unselected']='autobyteus-server-1'
 g('sudo -n docker stop '+r['unselected'],timeout=60)
 code="set -e; mkdir -p /root/.codex; printf API007_SYNTHETIC_NO_CREDENTIAL > /root/.codex/api007-sentinel; printf API007_PRIVATE_DATA > /home/autobyteus/data/api007-sentinel; printf API007_BROWSER_PROFILE > /home/vncuser/.config/chromium/api007-sentinel; chmod 600 /root/.codex/api007-sentinel"
 case('seed synthetic private auth/data/browser sentinel bytes',lambda:g('sudo -n docker exec '+r['selected']+' /bin/sh -c '+shlex.quote(code)))
 case('ordinary custom network alias setup',lambda:g('sudo -n docker network create api007-clients; sudo -n docker network connect --alias api007-primary api007-clients '+r['selected']))
 r['before']=json.loads(g('sudo -n docker inspect '+r['selected'])['stdout'])[0];r['unselectedBefore']=json.loads(g('sudo -n docker inspect '+r['unselected'])['stdout'])[0]
 assert r['before']['Image']==r['unselectedBefore']['Image']==r['serverImage'];assert r['before']['State']['Running'] and not r['unselectedBefore']['State']['Running']
 for bindings in r['before']['NetworkSettings']['Ports'].values():
  assert bindings and all(b['HostIp']=='127.0.0.1' for b in bindings),bindings
 r['privateHashes']=g('sudo -n docker exec '+r['selected']+' sha256sum /root/.codex/api007-sentinel /home/autobyteus/data/api007-sentinel /home/vncuser/.config/chromium/api007-sentinel')['stdout']
 r['result']='Ready';save();event('Two exact current launcher nodes prepared; selected running/unselected stopped, loopback ports and synthetic private bytes recorded')
except BaseException as x:r['result']='Incomplete';r['error']=repr(x);save();event('Node setup incomplete '+repr(x))
print(json.dumps({'result':r['result'],'error':r.get('error')}),flush=True)
