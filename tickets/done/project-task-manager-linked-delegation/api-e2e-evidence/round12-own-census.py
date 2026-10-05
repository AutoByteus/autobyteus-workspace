import json,subprocess,sys,datetime
from pathlib import Path
E=Path(__file__).parent;inst=json.loads((E/('api-012-'+('history-restart' if (E/'api-012-history-restart.json').exists() else 'restart' if (E/'api-012-restart.json').exists() else 'instance')+'.json')).read_text())['result'];assert inst['ownsDataRoot']
rows=[]
for l in subprocess.check_output(['ps','-axo','pid=,ppid=,comm='],text=True).splitlines():
 p=l.strip().split(maxsplit=2)
 if len(p)==3:rows.append({'pid':int(p[0]),'ppid':int(p[1]),'comm':p[2]})
ids={inst['pid']};change=True
while change:
 change=False
 for r in rows:
  if r['ppid'] in ids and r['pid'] not in ids:ids.add(r['pid']);change=True
own=[r for r in rows if r['pid'] in ids]
p=E/'api-012-captured-own-pids.json';old=json.loads(p.read_text()) if p.exists() else {'instanceId':inst['instanceId'],'captures':[],'capturedIds':[]};assert old['instanceId']==inst['instanceId'];old['captures'].append({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'phase':sys.argv[1],'current':own});old['capturedIds']=sorted(set(old['capturedIds'])|ids);p.write_text(json.dumps(old,indent=2)+'\n');print('Captured own census',len(own),'current',len(old['capturedIds']),'cumulative PIDs')
