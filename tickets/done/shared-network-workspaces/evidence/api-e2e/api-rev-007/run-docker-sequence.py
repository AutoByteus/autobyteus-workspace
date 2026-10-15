from pathlib import Path
import subprocess as sp,json
E=Path(__file__).resolve().parent
steps=[('prepare-linux-docker.py',[],'linux-docker-prepare-result.json','Ready'),('build-docker-variant.py',[],'build-docker-result.json','Ready'),('run-docker-selected-create.py',[],'docker-selected-create-result.json','Pass'),('run-docker-single-detach.py',[],'docker-single-detach-result.json','Pass'),('select-both.py',['LD'],'LD-both-create-result.json','Pass'),('run-filesystem-cases.py',['LD'],'LD-files-result.json','Pass'),('run-mounted-apis.py',['LD'],'LD-mounted-api-result.json','Pass'),('run-lifecycle.py',['LD'],'LD-lifecycle-result.json','Pass')]
for script,args,receipt,expected in steps:
 print('Starting '+script+' '+str(args),flush=True)
 with (E/('LD-'+script[:-3]+'-console.log')).open('w') as f:p=sp.run(['python3',str(E/script),*args],stdout=f,stderr=sp.STDOUT)
 d=json.loads((E/receipt).read_text());print(receipt+':'+d['result'],flush=True)
 assert p.returncode==0 and d['result']==expected,(script,d.get('fatal'),d.get('error'))
