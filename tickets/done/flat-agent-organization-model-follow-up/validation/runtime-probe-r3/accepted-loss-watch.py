from pathlib import Path
import json,time,os,signal,subprocess
E=Path(__file__).parent
for _ in range(1200):
 a=[json.loads(l) for l in (E/'browser-observations.jsonl').read_text().splitlines()]
 hit=[x for x in a if x['kind']=='incoming' and x['frame'].get('type')=='MEMBER_INPUT_MESSAGE' and x['frame']['payload'].get('recipient_agent_run_id')=='aorg_validation_agent_fac928909be146fea15f264ee6cb8ef0' and 'ACCEPTED-LOSS-R3-731' in x['frame']['payload'].get('content','')]
 if hit:
  info=json.loads((E/'server-info.json').read_text());assert info['pid']==96474
  cmd=subprocess.check_output(['ps','-p','96474','-o','command='],text=True);assert '--port 50244' in cmd and '/tests/.tmp/aorg-api-rev001' in cmd
  (E/'accepted-loss-trigger.json').write_text(json.dumps({'observedAcceptedInput':hit[-1],'server':info,'signal':'SIGKILL','managerPid':96169},indent=2))
  time.sleep(.25)
  os.kill(96474,signal.SIGKILL);os.kill(96169,signal.SIGTERM);print('Crash after actual frontend accepted-input frame',flush=True);break
 time.sleep(.1)
else:print('No matching accepted input; no process signalled')
