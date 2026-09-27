"""Bounded discovery-only probe; no production source or user workspace edits."""
import json, pathlib, subprocess, tempfile
out=pathlib.Path(__file__).parent
with tempfile.TemporaryDirectory(prefix='agy-1212-compat-') as tmp:
    root=pathlib.Path(tmp)
    a=root/'.agents/agents/compat-probe/agent.md'
    a.parent.mkdir(parents=True)
    a.write_text('---\nname: compat-probe\ndescription: Bounded runtime compatibility probe\nmainAgent: true\ntools: [view_file, write_to_file, replace_file_content, grep_search, list_dir, find_by_name, run_command, generate_image]\n---\nReply COMPAT-OK without calling any tool.\n')
    args=['agy','--new-project','--agent','compat-probe','--add-dir',tmp,'--model','gemini-3.8-flash-low','--input-format','stream-json','--output-format','stream-json']
    payload=json.dumps({'event':'user','message':{'content':'Reply COMPAT-OK without calling tools.'}})+'\n'
    p=subprocess.Popen(args,cwd=tmp,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    try: stdout,stderr=p.communicate(payload,timeout=45)
    except subprocess.TimeoutExpired:
        p.kill();stdout,stderr=p.communicate()
    (out/'compatibility-1212.stdout.jsonl').write_text(stdout)
    (out/'compatibility-1212.stderr.txt').write_text(stderr)
    events=[]
    for line in stdout.splitlines():
        try: events.append(json.loads(line))
        except ValueError: pass
    summary={'version':'1.2.12','exit':p.returncode,'eventTypes':[e.get('event') for e in events], 'init':next((e.get('init') for e in events if e.get('event')=='init'),None),'result':next((e.get('result') for e in events if e.get('event')=='result'),None),'limitation':'Discovery only; does not validate tool executions, MCP, team/org lifecycle or resume.'}
    (out/'compatibility-1212-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
    print(json.dumps(summary,indent=2))
