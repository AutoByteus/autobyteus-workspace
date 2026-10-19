from pathlib import Path
import sys
E=Path(__file__).resolve().parent;MODE=sys.argv[1];RESULT=MODE+'-setup-result.json';exec((E/('common-docker.py' if MODE=='LD' else 'common.py')).read_text());q=shlex.quote;nodes=['autobyteus-server-0','autobyteus-server-1'];r['mode']=MODE
try:
 if MODE=='LN':
  case('owned original nonempty source',lambda:g('mkdir -m 755 '+SRC+'; mkdir -m 755 '+SRC+'/project; printf ORIGINAL_API008 > '+SRC+'/project/preexisting.txt'))
 else:assert json.loads((E/'LN-detach-result.json').read_text())['result']=='Pass'
 case('start real nodes before intentional setup',lambda:g('sudo -n docker start '+' '.join(nodes),timeout=60))
 ip=json.loads(g('ip -4 -j addr show scope global')['stdout'])[0]['addr_info'][0]['local'];r['endpoint']=ip
 r['beforeSource']=g('stat -c "%d:%i:%u:%g:%a" '+SRC)['stdout'];r['beforeNodes']=json.loads(g('sudo -n docker inspect '+' '.join(nodes))['stdout']);save()
 data=Path(build['binary']['path']).read_bytes();assert hashlib.sha256(data).hexdigest()==build['binary']['sha256'];cmd(['exec','-i',V,'sh','-c','cat > '+B+'; chmod 755 '+B],data=data)
 z=case('public '+MODE+' create two selected actual nodes',lambda:nongroups(B+' create --source '+SRC+' --backend '+('ganesha-native' if MODE=='LN' else 'ganesha-docker')+' --endpoint '+ip+' --allow '+ip+' --nodes '+','.join(nodes)+' --yes --drained --json',timeout=300));v=json.loads(z['stdout']);assert v['status']['hostReady'] and all(v['status']['nodes'][n].startswith('ready;') for n in nodes);r['connection']=v['connection'];save()
 if MODE=='LD':assert r['connection']==json.loads((E/'LN-setup-result.json').read_text())['connection']
 assert g('stat -c "%d:%i:%u:%g:%a" '+SRC)['stdout']==r['beforeSource']
 for n in nodes:
  for i in range(60):
   z=g('sudo -n docker exec '+n+' node -e '+q("fetch('http://127.0.0.1:8000/rest/health').then(r=>{if(!r.ok)process.exit(1);return r.text()}).then(console.log).catch(()=>process.exit(1))"),timeout=10,check=False)
   if z['rc']==0:break
   time.sleep(2)
  else:raise RuntimeError('unhealthy '+n)
  case(n+' actual current mounted app healthy',lambda:z)
  z=g('sudo -n docker exec '+n+' sh -c '+q('cat '+ROOT+'/project/preexisting.txt; cat '+ROOT+'/.autobyteus-nfs/storage.json; cat /root/.codex/api008-sentinel'))
  assert 'ORIGINAL_API008' in z['stdout'] and r['connection']['storageId'] in z['stdout'] and 'API008_SYNTHETIC_'+n in z['stdout']
 r['afterNodes']=json.loads(g('sudo -n docker inspect '+' '.join(nodes))['stdout']);r['nativeMount']=g('findmnt -t nfs,nfs4; sha256sum '+SRC+'/project/preexisting.txt')['stdout'];r['result']='Pass';save();event('L23 '+MODE+' actual two-node public setup ready')
 if MODE=='LN':(E/'selected-create-result.json').write_text(json.dumps(r,indent=2)+'\n')
except BaseException as x:r['result']='Fail';r['error']=repr(x);save();raise
