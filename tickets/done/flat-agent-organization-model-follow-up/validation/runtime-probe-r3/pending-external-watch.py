from pathlib import Path
import json,time,os,signal,subprocess
E=Path(__file__).parent
for _ in range(12000):
 a=[json.loads(l) for l in (E/'browser-observations.jsonl').read_text().splitlines()]
 hit=[x for x in a if x['kind']=='frontend-outgoing' and x['frame'].get('type')=='SEND_MESSAGE' and 'PENDING-EXTERNAL-R3' in x['frame']['payload'].get('content','')]
 if hit:
  info=json.loads((E/'server-info.json').read_text());assert info['pid']==9642
  cmd=subprocess.check_output(['ps','-p','9642','-o','command='],text=True);assert '--port 50244' in cmd and '/tests/.tmp/aorg-api-rev001' in cmd
  (E/'pending-external-trigger.json').write_text(json.dumps({'outgoing':hit[-1],'server':info,'signal':'SIGKILL','managerPid':int(subprocess.check_output(['ps','-p','9642','-o','ppid='],text=True).strip())},indent=2))
  manager=int(subprocess.check_output(['ps','-p','9642','-o','ppid='],text=True).strip()); (E/'pending-external-before-crash-telemetry.json').write_text((E/'telemetry.json').read_text()); os.kill(9642,signal.SIGKILL);os.kill(manager,signal.SIGTERM);print('Owned crash at actual outgoing first Send',flush=True);break
 time.sleep(.01)
else:print('No matching frontend Send; no process signalled')
