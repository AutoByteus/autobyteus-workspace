from pathlib import Path
import json,subprocess,sys
E=Path(__file__).resolve().parent;W=E.parents[3];i=json.loads((E/'api-013-instance.json').read_text())['result'];assert i['ownsDataRoot'];mode=sys.argv[1];assert mode in ['restart','stop','list-before','list-after']
cmd=['pnpm','--silent','isolated-app']+(['restart',i['instanceId']] if mode=='restart' else ['stop',i['instanceId']] if mode=='stop' else ['list'])
p=subprocess.run(cmd,cwd=W,text=True,capture_output=True);print(p.stdout,flush=True);print(p.stderr,flush=True);assert p.returncode==0
j=json.loads(p.stdout);assert j['ok'];out={'restart':'api-013-history-restart.json','stop':'api-013-stop.json','list-before':'api-013-instances-before-stop.json','list-after':'api-013-instances-after.json'}[mode]
if mode=='restart':assert j['result']['instanceId']==i['instanceId'] and j['result']['dataRoot']==i['dataRoot'] and j['result']['ownsDataRoot'];assert j['result']['controlPort']==i['controlPort'] and j['result']['serverPort']==i['serverPort']
(E/out).write_text(json.dumps(j,indent=2)+'\n')
