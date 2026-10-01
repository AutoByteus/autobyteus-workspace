#!/usr/bin/env python3
"""Tests real workspace as AGY primary cwd with isolated custom-agent capsule added as another project folder."""
import json,pathlib,subprocess,tempfile
OUT=pathlib.Path(__file__).with_name('agy-primary-workspace-added-capsule-tools-probe')
OUT.mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix='autobyteus-agy-primary-real-') as temp:
 root=pathlib.Path(temp); real=root/'real-workspace'; capsule=root/'capsule'; real.mkdir(); capsule.mkdir()
 agent=capsule/'.agents'/'agents'/'capsule-probe'/'agent.md'; agent.parent.mkdir(parents=True)
 agent.write_text('---\nname: capsule-probe\ndescription: Disposable capsule identity probe.\nmainAgent: true\ntools: [write_to_file, view_file, run_command]\n---\nYour identity code is INDIGO-ANCHOR-3842. If asked, report this code accurately.\n')
 args=['agy','--new-project','--add-dir',str(capsule),'--agent','capsule-probe','--model','gemini-3.8-flash-low','--dangerously-skip-permissions','--output-format','stream-json','--print','Create a file named primary-root-probe.txt in the current project root containing ROOT-TEST-9024. Then state your assigned identity code and the absolute path of the created file.']
 p=subprocess.run(args,cwd=real,text=True,capture_output=True,timeout=120)
 (OUT/'stdout.jsonl').write_text(p.stdout); (OUT/'stderr.txt').write_text(p.stderr)
 ev=[json.loads(l) for l in p.stdout.splitlines() if l.startswith('{')]
 result=next((e['result'] for e in reversed(ev) if e.get('event')=='result'),{})
 print(json.dumps({'exit':p.returncode,'status':result.get('status'),'response':result.get('response'), 'realFile':(real/'primary-root-probe.txt').read_text() if (real/'primary-root-probe.txt').exists() else None, 'capsuleFile':(capsule/'primary-root-probe.txt').read_text() if (capsule/'primary-root-probe.txt').exists() else None, 'init':next((e.get('init') for e in ev if e.get('event')=='init'),{}), 'tools':[(e['step_update'].get('state'),e['step_update'].get('tool_name'),e['step_update'].get('tool_info',{}).get('parameters')) for e in ev if e.get('event')=='step_update' and e['step_update'].get('step_type')=='tool'],'stderrTail':p.stderr[-500:]}))
