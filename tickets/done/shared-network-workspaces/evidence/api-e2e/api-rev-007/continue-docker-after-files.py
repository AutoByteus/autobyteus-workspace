from pathlib import Path
import subprocess as sp,json
E=Path(__file__).resolve().parent
assert json.loads((E/'LD-files-v2-result.json').read_text())['result']=='Pass'
steps=[('run-mounted-apis.py',['LD'],'LD-mounted-api-result.json'),('run-preview-apis.py',['LD'],'LD-preview-api-result.json'),('run-lifecycle.py',['LD'],'LD-lifecycle-result.json'),('run-source-detach.py',['LD'],'LD-source-detach-result.json')]
for script,args,receipt in steps:
 print('Starting '+script+' '+str(args),flush=True)
 with (E/('LD-final-'+script[:-3]+'-console.log')).open('w') as f:p=sp.run(['python3',str(E/script),*args],stdout=f,stderr=sp.STDOUT)
 d=json.loads((E/receipt).read_text());print(receipt+':'+d['result'],flush=True)
 assert p.returncode==0 and d['result']=='Pass',(script,d.get('fatal'))
