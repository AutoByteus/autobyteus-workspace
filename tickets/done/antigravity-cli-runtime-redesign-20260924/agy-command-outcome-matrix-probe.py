#!/usr/bin/env python3
"""Live AGY 1.2.10 run_command outcome matrix, raw NDJSON retained."""
import json,pathlib,subprocess,tempfile
OUT=pathlib.Path(__file__).with_name('agy-command-outcome-matrix-probe');OUT.mkdir(exist_ok=True)
cases=[
 ('exit0', "sh -c 'printf OK-EXIT-0; exit 0'", True),
 ('exit8_empty', "sh -c 'exit 8'", True),
 ('not_found', 'agy_command_that_does_not_exist_73682', True),
 ('denied', 'printf DENIAL-CONTROL-7513', False),
]
summary=[]
for name,command,auto in cases:
 with tempfile.TemporaryDirectory(prefix='agy-command-outcome-matrix-') as temp:
  prompt=f"Use run_command to execute this exact shell command once: {command}. Do not retry or use another command. Then briefly report what happened."
  args=['agy','--new-project','--model','gemini-3.8-flash-low','--output-format','stream-json','--print-timeout','45s']
  if auto:args.append('--dangerously-skip-permissions')
  args.extend(['--print',prompt])
  try:
   p=subprocess.run(args,cwd=temp,text=True,capture_output=True,timeout=65)
   stdout,stderr,process_exit=p.stdout,p.stderr,p.returncode
  except subprocess.TimeoutExpired as exc:
   stdout=exc.stdout.decode() if isinstance(exc.stdout,bytes) else exc.stdout or ''
   stderr=exc.stderr.decode() if isinstance(exc.stderr,bytes) else exc.stderr or ''
   process_exit='timeout'
  (OUT/f'{name}.stdout.jsonl').write_text(stdout)
  (OUT/f'{name}.stderr.txt').write_text(stderr)
  ev=[]
  for line in stdout.splitlines():
   if line.startswith('{'):
    try:ev.append(json.loads(line))
    except:pass
  init=next((e.get('init') for e in ev if e.get('event')=='init'),{})
  result=next((e.get('result') for e in reversed(ev) if e.get('event')=='result'),{})
  steps=[e['step_update'] for e in ev if e.get('event')=='step_update' and e.get('step_update',{}).get('step_type')=='tool']
  rec={'case':name,'requestedCommand':command,'autoApprove':auto,'processExit':process_exit,'initPermissionMode':init.get('permission_mode'),'resultStatus':result.get('status'),'resultResponse':result.get('response'),'resultDeniedActions':result.get('denied_actions'),'toolSteps':[{'index':s.get('step_index'),'state':s.get('state'),'name':s.get('tool_name'),'toolInfo':s.get('tool_info')} for s in steps],'stderrTail':stderr[-650:]}
  summary.append(rec)
  print(json.dumps({'case':name,'processExit':rec['processExit'],'resultStatus':rec['resultStatus'],'tools':[(s['state'],s['name'],s['toolInfo']) for s in rec['toolSteps']],'denied':rec['resultDeniedActions']},ensure_ascii=False),flush=True)
(OUT/'summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n')
