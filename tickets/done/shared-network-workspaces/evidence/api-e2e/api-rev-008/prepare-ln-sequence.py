from pathlib import Path
import json,time,subprocess as sp
E=Path(__file__).resolve().parent;T=E.parents[2]
for n in ['linux-resource.json','build-result.json']:
 end=time.monotonic()+1000
 while time.monotonic()<end:
  try:
   d=json.loads((E/n).read_text())
   if n=='linux-resource.json' or d.get('result')=='Ready':break
   assert d.get('result') in ['Preparing','Building'],d.get('error')
  except (FileNotFoundError,json.JSONDecodeError):pass
  time.sleep(2)
 else:raise RuntimeError('missing prerequisite '+n)
for name in ['prepare-docker.py','prepare-managed-client-image.py','setup-nodes.py','setup-mode.py LN','prepare-preview-fixtures.py','run-preview-apis.py LN','start-guest-loopback-tunnel.py']:
 args=name.split();cmd=['python3',str(E/args[0]),*args[1:]];print('Starting '+name,flush=True)
 with (E/(args[0].replace('.py','')+'-console.log')).open('w') as out:p=sp.run(cmd,stdout=out,stderr=sp.STDOUT)
 if p.returncode:raise RuntimeError('Stopped '+name)
 result={'prepare-docker.py':'docker-prepare-result.json','prepare-managed-client-image.py':'managed-client-image-result.json','setup-nodes.py':'nodes-result.json','setup-mode.py':'LN-setup-result.json','prepare-preview-fixtures.py':'preview-fixture-result.json','run-preview-apis.py':'LN-preview-api-result.json','start-guest-loopback-tunnel.py':'guest-loopback-tunnel-result.json'}[args[0]]
 d=json.loads((E/result).read_text());assert d['result'] in ['Ready','Pass'],d.get('error') or d.get('fatal')
 print('Completed '+name+': '+d['result'],flush=True)
