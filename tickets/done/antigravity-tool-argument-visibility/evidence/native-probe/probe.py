import pathlib,subprocess,json,selectors,time,os,signal
root=pathlib.Path(__file__).resolve().parent
capsule=root/'capsule'; workspace=root/'workspace'
workspace.mkdir(exist_ok=True); (capsule/'.agents/agents/argument-probe').mkdir(parents=True,exist_ok=True)
(capsule/'.agents/agents/argument-probe/agent.md').write_text(f'''---
name: argument-probe
description: Disposable native argument observability probe.
mainAgent: true
tools: [view_file, write_to_file, replace_file_content, grep_search, list_dir, find_by_name, run_command]
---
You are a narrowly scoped diagnostic agent. Only read or modify files inside `{workspace}`. Do not access other workspaces or user files. Do not use MCP tools, background processes, skills or subagents. Perform the exact requested native calls, then stop. This is a disposable probe.
''')
(capsule/'.agents/mcp_config.json').write_text('{"mcpServers":{}}\n')
file=workspace/'marker.txt'
prompt=f'''Use native tools for these steps, in order. Do not use shell substitutes for file or search operations.
1. write_to_file: TargetFile `{file}`, CodeContent `BEFORE_MARKER_7831\\nsecond line\\n`, Overwrite true, EmptyFile false.
2. view_file: AbsolutePath `{file}`, StartLine 1, EndLine 2.
3. replace_file_content: TargetFile `{file}`, TargetContent `BEFORE_MARKER_7831`, ReplacementContent `AFTER_MARKER_7831`, StartLine 1, EndLine 2, AllowMultiple false. Give a brief Description and Instruction.
4. grep_search: SearchPath `{workspace}`, Query `AFTER_MARKER_7831`, CaseInsensitive false, MatchPerLine true, Includes ["*.txt"].
5. find_by_name: SearchDirectory `{workspace}`, Pattern "*.txt", Type "file", MaxDepth 1.
6. list_dir: DirectoryPath `{workspace}`.
7. run_command: CommandLine "printf ARGUMENT_PROBE_OK", Cwd `{workspace}`, WaitMsBeforeAsync 1000, IsDaemon false, SafeToAutoRun true. No background task.
8. view_file: AbsolutePath `{file}`, StartLine 1, EndLine 2. Then respond only DONE.
Only use files in the disposable workspace above.'''
argv=['/Users/normy/.local/bin/agy','--new-project','--agent','argument-probe','--add-dir',str(workspace),'--model','gemini-3.8-flash-low','--input-format','stream-json','--output-format','stream-json','--dangerously-skip-permissions','--log-file',str(root/'cli.log')]
(root/'launch.json').write_text(json.dumps({'argv':argv,'cwd':str(capsule),'prompt':prompt,'date':'2026-10-03','version':subprocess.check_output([argv[0],'--version'],text=True).strip()},indent=2))
with (root/'stdout.jsonl').open('w') as out,(root/'stderr.txt').open('w') as err:
 p=subprocess.Popen(argv,cwd=capsule,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=err,text=True,start_new_session=True)
 sel=selectors.DefaultSelector();sel.register(p.stdout,selectors.EVENT_READ)
 deadline=time.monotonic()+180; conversation=None; sent=False;result=None
 try:
  while time.monotonic()<deadline:
   ready=sel.select(1)
   if not ready:
    if p.poll() is not None: break
    continue
   line=p.stdout.readline()
   if not line:break
   out.write(line);out.flush()
   try:o=json.loads(line)
   except:continue
   if o.get('event')=='init':
    conversation=o.get('conversation_id');print('INIT',conversation,flush=True)
    p.stdin.write(json.dumps({'event':'user','message':{'content':prompt}})+'\n');p.stdin.flush();sent=True
   if o.get('event')=='step_update' and o['step_update'].get('step_type')=='tool':
    x=o['step_update'];print('TOOL',x.get('step_index'),x.get('tool_name'),x.get('state'),json.dumps(x.get('tool_info')),flush=True)
   if o.get('event')=='result':result=o;print('RESULT',json.dumps(o),flush=True);break
 finally:
  if p.poll() is None:
   os.killpg(p.pid,signal.SIGTERM)
   try:p.wait(timeout=8)
   except subprocess.TimeoutExpired:os.killpg(p.pid,signal.SIGKILL);p.wait()
  (root/'summary.json').write_text(json.dumps({'conversation':conversation,'sent':sent,'result':result,'exitCode':p.returncode,'fileContent':file.read_text() if file.exists() else None},indent=2))
print('SUMMARY', (root/'summary.json').read_text(),flush=True)
