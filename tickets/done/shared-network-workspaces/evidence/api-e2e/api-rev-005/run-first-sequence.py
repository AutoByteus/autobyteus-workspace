from pathlib import Path
import json,subprocess as sp,time
E=Path(__file__).resolve().parent
deadline=time.monotonic()+660
while time.monotonic()<deadline:
 r=json.loads((E/'linux-resource.json').read_text())
 if r['result']!='Preparing':break
 time.sleep(5)
assert r['result']=='Ready',r
steps=[('start-linux.py','linux-start.json','Ready'),('prepare-docker.py','docker-prepare-result.json','Ready'),('prepare-managed-client-image.py','managed-client-image-result.json','Ready'),('prepare-managed-nodes.py','managed-nodes-prepare-result.json','Ready'),('run-selected-create.py','selected-create-result.json','Pass'),('run-visibility.py','visibility-result.json','Pass')]
for script,receipt,expected in steps:
 print('Starting '+script,flush=True)
 with (E/(script.removesuffix('.py')+'-console.log')).open('w') as f:p=sp.run(['python3',str(E/script)],stdout=f,stderr=sp.STDOUT)
 assert p.returncode==0,(script,p.returncode)
 r=json.loads((E/receipt).read_text());print(script+': '+r['result'],flush=True)
 assert r['result']==expected,(script,r.get('fatal'),r.get('error'))
