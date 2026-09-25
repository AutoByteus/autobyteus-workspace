#!/usr/bin/env python3
"""Disposable AGY custom main-agent tool-frontmatter constructor controls."""
import json,pathlib,subprocess,tempfile
OUT=pathlib.Path(__file__).with_name('agy-main-agent-toolset-probe');OUT.mkdir(exist_ok=True)
cases={
 'valid8':['view_file','write_to_file','replace_file_content','multi_replace_file_content','grep_search','list_dir','find_by_name','run_command'],
 'invalid_aux':['view_file','write_to_file','run_command','call_mcp_tool','command_status','send_command_input','sed_file'],
}
summary=[]
for case,tools in cases.items():
 with tempfile.TemporaryDirectory(prefix='agy-main-toolset-') as temp:
  root=pathlib.Path(temp);agent=root/'.agents'/'agents'/'toolset-probe'/'agent.md';agent.parent.mkdir(parents=True)
  agent.write_text('---\nname: toolset-probe\ndescription: Disposable main-agent toolset constructor control.\nmainAgent: true\ntools: ['+', '.join(tools)+']\n---\n\nReply OK.\n')
  p=subprocess.run(['agy','--new-project','--agent','toolset-probe','--model','gemini-3.8-flash-low','--output-format','stream-json','--print-timeout','25s','--print','Reply OK.'],cwd=root,text=True,capture_output=True,timeout=40)
  (OUT/f'{case}.stdout.jsonl').write_text(p.stdout);(OUT/f'{case}.stderr.txt').write_text(p.stderr)
  events=[]
  for line in p.stdout.splitlines():
   if line.startswith('{'):
    try:events.append(json.loads(line))
    except:pass
  init=next((e.get('init') for e in events if e.get('event')=='init'),{})
  result=next((e.get('result') for e in reversed(events) if e.get('event')=='result'),{})
  summary.append({'case':case,'tools':tools,'exit':p.returncode,'status':result.get('status'),'response':result.get('response'),'agent':init.get('agent'),'stderrTail':p.stderr[-750:]})
(OUT/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2))
