from pathlib import Path
import shutil
E=Path(__file__).resolve().parent;RESULT='node-b-fixture-reset.json';exec((E/'common.py').read_text())
setup=json.loads((E/'managed-client-image-result.json').read_text());home='/home/admin/api007-launcher-home';launcher=setup['launcherRoot']+'/scripts/public/docker/autobyteus-docker.sh';node='autobyteus-server-1'
def launch(args):return g('sudo -n env -i HOME='+home+' PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin bash '+launcher+' '+args,timeout=180)
try:
 A=E/'both-create-attempt-1';A.mkdir(exist_ok=True)
 for n in ['LN-both-create-result.json','LN-both-create-console.log','select-both.py']:shutil.copy2(E/n,A/n)
 r['before']=json.loads(g('sudo -n docker inspect '+node)['stdout'])[0];r['logs']=g('sudo -n docker logs --timestamps '+node,check=False,timeout=30);save()
 # The harness stopped this brand new node without awaiting its first successful health.
 # Its database migration was interrupted before any application/NFS test. No in-place DB repair.
 volumes=[m['Name'] for m in r['before']['Mounts'] if m['Type']=='volume'];assert volumes and all(node in n for n in volumes),volumes
 case('destroy only interrupted fresh B through public launcher',lambda:launch('destroy --name '+node))
 case('remove exact test-only B private volumes for clean fixture rebuild',lambda:g('sudo -n docker volume rm '+' '.join(volumes),timeout=60))
 case('recreate B through unchanged current public launcher',lambda:launch('new-container --image '+setup['guestRegistryDigest']))
 for i in range(100):
  z=g('sudo -n docker exec '+node+' node -e '+shlex.quote("fetch('http://127.0.0.1:8000/rest/health').then(r=>{if(!r.ok)process.exit(1);return r.text()}).then(console.log).catch(()=>process.exit(1))"),check=False,timeout=10)
  if z['rc']==0:break
  time.sleep(2)
 else:raise RuntimeError('fresh B no health after clean creation')
 r['health']=z;r['after']=json.loads(g('sudo -n docker inspect '+node)['stdout'])[0];assert r['after']['Image']==r['before']['Image'];r['result']='Ready';save()
 event('L03 fixture correction: initial B Stop interrupted first database migration. Preserved failed attempt/logs; rebuilt only exact owned B volumes through public launcher and waited for real health. A-only unselected proof retains old B ID scope; no database/schema/product changes.')
except BaseException as x:r['result']='Incomplete';r['fatal']=repr(x);save();raise
