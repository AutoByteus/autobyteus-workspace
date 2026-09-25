#!/usr/bin/env python3
"""Disposable controls for the exact short AGY workspace stanza in design-spec.md."""
import json, pathlib, subprocess, tempfile
OUT = pathlib.Path(__file__).with_name('agy-minimal-workspace-agent-probe')
OUT.mkdir(exist_ok=True)
summary=[]
for case, request in (
    ('file', 'Create a file named minimal-file.txt in your agent workspace with the exact contents MINIMAL-FILE-6829. Use write_to_file. Tell me the absolute path.'),
    ('shell', 'Use run_command to create a file named minimal-shell.txt in your agent workspace with the exact contents MINIMAL-SHELL-5307. Tell me the absolute path.'),
):
    with tempfile.TemporaryDirectory(prefix='autobyteus-agy-minimal-workspace-') as temp:
        root=pathlib.Path(temp); capsule=root/'capsule'; workspace=root/'selected-workspace'
        capsule.mkdir(); workspace.mkdir()
        agent=capsule/'.agents'/'agents'/'capsule-probe'/'agent.md'; agent.parent.mkdir(parents=True)
        agent.write_text('---\nname: capsule-probe\ndescription: Disposable minimal workspace instruction probe.\nmainAgent: true\ntools: [write_to_file, view_file, run_command]\n---\n\n## Working Environment\n- Agent workspace: `'+str(workspace)+'`\n- Resolve task and project locations from the agent workspace unless an explicit target says otherwise.\n')
        args=['agy','--new-project','--agent','capsule-probe','--add-dir',str(workspace),'--model','gemini-3.8-flash-low','--dangerously-skip-permissions','--output-format','stream-json','--print',request]
        proc=subprocess.run(args,cwd=capsule,text=True,capture_output=True,timeout=150)
        (OUT/f'{case}.stdout.jsonl').write_text(proc.stdout)
        (OUT/f'{case}.stderr.txt').write_text(proc.stderr)
        events=[]
        for line in proc.stdout.splitlines():
            if line.startswith('{'):
                try: events.append(json.loads(line))
                except json.JSONDecodeError: pass
        tool=[]
        for event in events:
            step=event.get('step_update',{})
            if step.get('step_type')=='tool':
                tool.append({'state':step.get('state'),'name':step.get('tool_name'),'parameters':step.get('tool_info',{}).get('parameters'),'error':step.get('tool_info',{}).get('error')})
        filename='minimal-file.txt' if case=='file' else 'minimal-shell.txt'
        result=next((e['result'] for e in reversed(events) if e.get('event')=='result'),{})
        summary.append({'case':case,'exit':proc.returncode,'initCwd':next((e.get('init',{}).get('cwd') for e in events if e.get('event')=='init'),None),'status':result.get('status'),'response':result.get('response'),'workspaceFile':(workspace/filename).read_text() if (workspace/filename).exists() else None,'capsuleFile':(capsule/filename).read_text() if (capsule/filename).exists() else None,'tools':tool,'stderrTail':proc.stderr[-500:]})
(OUT/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary,indent=2))
