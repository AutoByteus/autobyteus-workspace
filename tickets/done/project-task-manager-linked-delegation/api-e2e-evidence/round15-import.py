from pathlib import Path
import json,sys,subprocess
E=Path(__file__).resolve().parent;W=E.parents[3];i=json.loads((E/'api-015-instance.json').read_text())['result'];assert i['ownsDataRoot'] and i['databaseUrl']=='file:'+str(Path(i['dataRoot'])/'server-data/db/production.db')
cmd=json.loads((E/'api-015-import-command.json').read_text());mode=sys.argv[1];assert mode in ['preview','execute','restart']
if mode=='preview':p=subprocess.run(cmd+['--dry-run'],cwd=W)
elif mode=='execute':
 p=subprocess.run(['script','-q',str(E/'api-015-import-tty.log'),*cmd],cwd=W,input='IMPORT\n',text=True)
else:
 p=subprocess.run(['pnpm','--silent','isolated-app','restart',i['instanceId']],cwd=W,capture_output=True,text=True);print(p.stdout,p.stderr);assert p.returncode==0
 j=json.loads(p.stdout);assert j['ok'] and j['result']['instanceId']==i['instanceId'] and j['result']['dataRoot']==i['dataRoot'] and j['result']['controlPort']==i['controlPort'] and j['result']['serverPort']==i['serverPort'];(E/'api-015-restart.json').write_text(json.dumps(j,indent=2)+'\n')
assert p.returncode==0,p.returncode
