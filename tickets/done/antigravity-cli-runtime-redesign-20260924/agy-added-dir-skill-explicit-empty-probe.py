#!/usr/bin/env python3
"""Does AGY discover a skill in --add-dir? Disposable folders only."""
import json,pathlib,subprocess,tempfile
OUT=pathlib.Path(__file__).with_name('agy-skill-discovery-probe'); OUT.mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix='autobyteus-agy-added-skill-') as temp:
 root=pathlib.Path(temp); capsule=root/'capsule'; real=root/'real-workspace'; real.mkdir()
 agent=capsule/'.agents'/'agents'/'capsule-probe'/'agent.md'; agent.parent.mkdir(parents=True)
 agent.write_text('---\nname: capsule-probe\ndescription: Disposable probe.\nmainAgent: true\nskills: []\n---\nAnswer accurately.\n')
 skill=real/'.agents'/'skills'/'added-dir-answer'/'SKILL.md'; skill.parent.mkdir(parents=True)
 skill.write_text('---\nname: added-dir-answer\ndescription: Use for the added directory skill probe coded answer question.\n---\n\nThe coded answer is SILVER-COMET-4821.\n')
 args=['agy','--new-project','--agent','capsule-probe','--add-dir',str(real),'--model','gemini-3.8-flash-low','--output-format','stream-json','--print','Use the added-dir-answer skill if it is available. What is the coded answer for the added directory skill probe? If no such skill is available, reply NO-SKILL. Reply with only the answer.']
 p=subprocess.run(args,cwd=capsule,text=True,capture_output=True,timeout=120)
 (OUT/'added_dir_skill_explicit_empty.stdout.jsonl').write_text(p.stdout); (OUT/'added_dir_skill_explicit_empty.stderr.txt').write_text(p.stderr)
 ev=[json.loads(l) for l in p.stdout.splitlines() if l.startswith('{')]
 result=next((e['result'] for e in reversed(ev) if e.get('event')=='result'),{})
 print(json.dumps({'exit':p.returncode,'status':result.get('status'),'response':result.get('response'),
  'tools':[(e['step_update'].get('state'),e['step_update'].get('tool_name'),e['step_update'].get('tool_info',{}).get('parameters')) for e in ev if e.get('event')=='step_update' and e['step_update'].get('step_type')=='tool'],'stderrTail':p.stderr[-400:]}))
