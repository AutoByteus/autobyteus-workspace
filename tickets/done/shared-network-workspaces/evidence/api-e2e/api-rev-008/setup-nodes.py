from pathlib import Path
E=Path(__file__).resolve().parent;RESULT='nodes-result.json';exec((E/'common.py').read_text())
a=json.loads((E/'managed-client-image-result.json').read_text());assert a['result']=='Ready';q=shlex.quote;nodes=['autobyteus-server-0','autobyteus-server-1'];launcher=a['launcherRoot']+'/scripts/public/docker/autobyteus-docker.sh';home='/home/admin/api008-launcher-home'
try:
 assert not g('sudo -n docker ps -a --filter label=com.autobyteus.launcher=server-docker --format "{{.Names}}"')['stdout'].strip()
 for n in nodes:
  case('public launcher '+n,lambda:g('sudo -n env -i HOME='+home+' PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin bash '+launcher+' new-container --image '+a['guestRegistryDigest'],timeout=180))
  for i in range(60):
   z=g('sudo -n docker exec '+n+' node -e '+q("fetch('http://127.0.0.1:8000/rest/health').then(r=>{if(!r.ok)process.exit(1);return r.text()}).then(console.log).catch(()=>process.exit(1))"),timeout=10,check=False)
   if z['rc']==0:break
   time.sleep(2)
  else:raise RuntimeError('unhealthy '+n)
  case(n+' actual health (initial migration fully complete)',lambda:z)
  g('sudo -n docker exec '+n+" sh -c "+q('mkdir -p /root/.codex; printf API008_SYNTHETIC_'+n+' > /root/.codex/api008-sentinel'))
 r['nodes']=json.loads(g('sudo -n docker inspect '+' '.join(nodes))['stdout']);r['image']=a['hostImage']
 for n in r['nodes']:
  assert n['Image']==r['image'] and n['State']['Running']
  assert all(x['HostIp']=='127.0.0.1' for v in n['NetworkSettings']['Ports'].values() for x in v)
 r['result']='Pass';save()
except BaseException as x:r['result']='Fail';r['error']=repr(x);save();raise
