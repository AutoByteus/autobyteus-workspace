#!/usr/bin/env python3
"""Disposable AGY call_mcp_tool stream-shape probe. Temp capsule only; no user-global config changes."""
import json, pathlib, subprocess, sys, tempfile
OUT=pathlib.Path(__file__).with_name('agy-mcp-call-shape-probe');OUT.mkdir(exist_ok=True)
SERVER='''#!/usr/bin/env python3
import json,os,sys
log=open(os.environ['PROBE_LOG'],'a',buffering=1)
TOOLS=[
 {'name':'echo_args','description':'Echoes a note and nested options.','inputSchema':{'type':'object','properties':{'note':{'type':'string'},'options':{'type':'object','properties':{'count':{'type':'integer'},'tags':{'type':'array','items':{'type':'string'}}}}},'required':['note']}},
 {'name':'json_result','description':'Returns a JSON object as text.','inputSchema':{'type':'object','properties':{},'additionalProperties':False}},
 {'name':'always_fails','description':'Always returns an MCP tool error.','inputSchema':{'type':'object','properties':{'reason':{'type':'string'}}}},
]
for line in sys.stdin:
 try: msg=json.loads(line)
 except Exception: continue
 method=msg.get('method');log.write(json.dumps(msg)+'\\n')
 if 'id' not in msg: continue
 if method=='initialize': result={'protocolVersion':msg.get('params',{}).get('protocolVersion','2025-03-26'),'capabilities':{'tools':{}},'serverInfo':{'name':'shape-probe','version':'0.0.1'}}
 elif method=='tools/list': result={'tools':TOOLS}
 elif method=='tools/call':
  name=msg['params'].get('name');args=msg['params'].get('arguments')
  if name=='echo_args': result={'content':[{'type':'text','text':'ECHO:'+json.dumps(args,sort_keys=True)}],'isError':False}
  elif name=='json_result': result={'content':[{'type':'text','text':json.dumps({'marker':'JSON-MARKER-4471','nested':{'ok':True}},indent=2)}],'isError':False}
  else: result={'content':[{'type':'text','text':'PROBE-FAILURE-9920: deliberate failure'}],'isError':True}
 elif method=='resources/list': result={'resources':[]}
 elif method=='prompts/list': result={'prompts':[]}
 else: result={}
 sys.stdout.write(json.dumps({'jsonrpc':'2.0','id':msg['id'],'result':result})+'\\n');sys.stdout.flush()
'''
PROMPT=('Use the shape-test MCP server. Make exactly three tool calls, one after another, even if one fails: '
 '1) echo_args with note "hello" and options {"count": 2, "tags": ["a","b"]}; '
 '2) json_result with no arguments; 3) always_fails with reason "probe". '
 'Then report the exact text each returned. Do not retry failures.')
with tempfile.TemporaryDirectory(prefix='autobyteus-agy-mcp-shape-') as temp:
 root=pathlib.Path(temp);capsule=root/'capsule';workspace=root/'selected-workspace';capsule.mkdir();workspace.mkdir()
 agent=capsule/'.agents'/'agents'/'shape-probe'/'agent.md';agent.parent.mkdir(parents=True)
 agent.write_text('---\nname: shape-probe\ndescription: Disposable MCP stream-shape control.\nmainAgent: true\ntools: [run_command, view_file, write_to_file]\n---\n\n## Working Environment\n- Agent workspace: `'+str(workspace)+'`\n')
 server=root/'server.py';server.write_text(SERVER);log=root/'server.log'
 (capsule/'.agents'/'mcp_config.json').write_text(json.dumps({'mcpServers':{'shape-test':{'command':sys.executable,'args':[str(server)],'env':{'PROBE_LOG':str(log)}}}}))
 version=subprocess.run(['agy','--version'],text=True,capture_output=True).stdout.strip()
 args=['agy','--new-project','--agent','shape-probe','--add-dir',str(workspace),'--model','gemini-3.8-flash-low','--dangerously-skip-permissions','--output-format','stream-json','--print',PROMPT]
 p=subprocess.run(args,cwd=capsule,text=True,capture_output=True,timeout=240)
 (OUT/'stdout.jsonl').write_text(p.stdout);(OUT/'stderr.txt').write_text(p.stderr)
 (OUT/'mcp-server-messages.jsonl').write_text(log.read_text() if log.exists() else '')
 ev=[]
 for l in p.stdout.splitlines():
  if l.startswith('{'):
   try:ev.append(json.loads(l))
   except Exception:pass
 result=next((e['result'] for e in reversed(ev) if e.get('event')=='result'),{})
 tools=[{k:e['step_update'].get(k) for k in ('step_index','state','tool_name','tool_info')} for e in ev if e.get('event')=='step_update' and e['step_update'].get('step_type')=='tool']
 calls=[json.loads(x).get('params') for x in log.read_text().splitlines() if x.startswith('{') and json.loads(x).get('method')=='tools/call'] if log.exists() else []
 summary={'agyVersion':version,'exit':p.returncode,'status':result.get('status'),'response':result.get('response'),'serverToolCalls':calls,'toolSteps':tools,'stderrTail':p.stderr[-500:]}
 (OUT/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2))
