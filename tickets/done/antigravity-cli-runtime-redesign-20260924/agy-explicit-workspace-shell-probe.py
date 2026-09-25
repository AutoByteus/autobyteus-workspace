#!/usr/bin/env python3
"""Disposable test: capsule is primary cwd, real workspace is --add-dir and named in custom agent.md."""
import json,pathlib,subprocess,tempfile
OUT=pathlib.Path(__file__).with_name('agy-explicit-workspace-shell-probe'); OUT.mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix='autobyteus-agy-workspace-in-agent-') as temp:
 root=pathlib.Path(temp); capsule=root/'capsule'; real=root/'real-workspace'; capsule.mkdir(); real.mkdir()
 agent=capsule/'.agents'/'agents'/'capsule-probe'/'agent.md'; agent.parent.mkdir(parents=True)
 agent.write_text('---\nname: capsule-probe\ndescription: Disposable workspace-root instruction probe.\nmainAgent: true\ntools: [write_to_file, view_file, run_command]\n---\n\n## Working Environment\n- Agent workspace: `'+str(real)+'`\n- This is the root for all task files. The primary process directory `'+str(capsule)+'` contains only run configuration; do not write task files there.\n- For file tools, use absolute target paths inside the agent workspace. For shell commands, use `cd '+str(real)+' && ...` when the command needs the workspace as its working directory.\n')
 args=['agy','--new-project','--agent','capsule-probe','--add-dir',str(real),'--model','gemini-3.8-flash-low','--dangerously-skip-permissions','--output-format','stream-json','--print','Use run_command to create shell-file.txt in your agent workspace containing SHELL-ROOT-7194, then tell me its absolute path.']
 p=subprocess.run(args,cwd=capsule,text=True,capture_output=True,timeout=120)
 (OUT/'stdout.jsonl').write_text(p.stdout); (OUT/'stderr.txt').write_text(p.stderr)
 ev=[json.loads(l) for l in p.stdout.splitlines() if l.startswith('{')]
 result=next((e['result'] for e in reversed(ev) if e.get('event')=='result'),{})
 print(json.dumps({'exit':p.returncode,'status':result.get('status'),'response':result.get('response'),'realFile':(real/'shell-file.txt').read_text() if (real/'shell-file.txt').exists() else None,'capsuleFile':(capsule/'shell-file.txt').read_text() if (capsule/'shell-file.txt').exists() else None,'toolTargets':[(e['step_update'].get('state'),e['step_update'].get('tool_name'),e['step_update'].get('tool_info',{}).get('parameters')) for e in ev if e.get('event')=='step_update' and e['step_update'].get('step_type')=='tool'],'stderrTail':p.stderr[-300:]}))
