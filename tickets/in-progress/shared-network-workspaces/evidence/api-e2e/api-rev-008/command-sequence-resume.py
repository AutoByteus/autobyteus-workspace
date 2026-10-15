from pathlib import Path
import json,time,subprocess as sp
E=Path(__file__).resolve().parent
end=time.monotonic()+1800
while not (E/'linux-resource.json').exists():
 assert time.monotonic()<end,'owned guest download not ready';time.sleep(3)
steps=[('prepare-linux-docker-v2.py','linux-docker-prepare-v2-result.json'),('build-docker-variant.py','build-docker-result.json'),('setup-command-mode.py LD','LD-command-setup-result.json'),('run-command-cases.py LD','LD-commands-result.json'),('detach-command-mode.py LD','LD-command-detach-result.json')]
for step,result in steps:
 a=step.split();assert not (E/result).exists(),'will not overwrite previous attempt: '+result
 print('START '+step,flush=True)
 with (E/('command-sequence-'+step.replace(' ','-').replace('.py','')+'.log')).open('w') as f:p=sp.run(['python3',str(E/a[0]),*a[1:]],stdout=f,stderr=sp.STDOUT)
 assert p.returncode==0,'command failed: '+step
 d=json.loads((E/result).read_text());assert d['result'] in ['Pass','Ready'],d
 print('COMPLETE '+step,flush=True)
print('All command sequence steps completed; final audit/cleanup still required',flush=True)
