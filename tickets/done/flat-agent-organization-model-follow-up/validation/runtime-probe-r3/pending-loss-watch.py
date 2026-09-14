from pathlib import Path
import json,time,os,signal,subprocess
E=Path(__file__).parent
for _ in range(12000):
 a=[json.loads(l) for l in (E/'browser-observations.jsonl').read_text().splitlines()]
 hit=[x for x in a if x['kind']=='frontend-outgoing' and x['frame'].get('type')=='SEND_MESSAGE' and 'PENDING-SEND-R3-731' in x['frame']['payload'].get('content','')]
 if hit:
  info=json.loads((E/'server-info.json').read_text());assert info['pid']==3713
  cmd=subprocess.check_output(['ps','-p','3713','-o','command='],text=True);assert '--port 50244' in cmd and '/tests/.tmp/aorg-api-rev001' in cmd
  (E/'pending-loss-trigger.json').write_text(json.dumps({'outgoing':hit[-1],'server':info,'signal':'SIGKILL','managerPid':3382},indent=2))
  os.kill(3713,signal.SIGKILL);os.kill(3382,signal.SIGTERM);print('Owned crash at actual outgoing first Send',flush=True);break
 time.sleep(.01)
else:print('No matching frontend Send; no process signalled')
