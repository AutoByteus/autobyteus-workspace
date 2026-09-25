#!/usr/bin/env python3
"""Disposable AGY capsule MCP discovery control. No user-global config changes."""
import json, os, pathlib, subprocess, sys, tempfile
OUT=pathlib.Path(__file__).with_name('agy-capsule-mcp-probe');OUT.mkdir(exist_ok=True)
SERVER='''#!/usr/bin/env python3
import json,os,sys
log=open(os.environ['PROBE_LOG'],'a',buffering=1)
for line in sys.stdin:
 try: msg=json.loads(line)
 except Exception as e:
  log.write('BAD:'+repr(line)+'\\n');continue
 method=msg.get('method');log.write(json.dumps(msg)+'\\n')
 if 'id' not in msg: continue
 if method=='initialize': result={'protocolVersion':msg.get('params',{}).get('protocolVersion','2025-03-26'),'capabilities':{'tools':{}},'serverInfo':{'name':'capsule-mcp-probe','version':'0.0.1'}}
 elif method=='tools/list': result={'tools':[{'name':'probe_echo','description':'Returns the capsule configuration test marker when asked.','inputSchema':{'type':'object','properties':{},'additionalProperties':False}}]}
 elif method=='tools/call': result={'content':[{'type':'text','text':'CAPSULE-MCP-MARKER-7318'}],'isError':False}
 elif method=='resources/list': result={'resources':[]}
 elif method=='prompts/list': result={'prompts':[]}
 elif method=='ping': result={}
 else: result={}
 sys.stdout.write(json.dumps({'jsonrpc':'2.0','id':msg['id'],'result':result})+'\\n');sys.stdout.flush()
'''
with tempfile.TemporaryDirectory(prefix='autobyteus-agy-mcp-') as temp:
 root=pathlib.Path(temp);capsule=root/'capsule';workspace=root/'selected-workspace';capsule.mkdir();workspace.mkdir()
 agent=capsule/'.agents'/'agents'/'capsule-probe'/'agent.md';agent.parent.mkdir(parents=True)
 agent.write_text('---\nname: capsule-probe\ndescription: Disposable capsule MCP control.\nmainAgent: true\ntools: [run_command, view_file, write_to_file]\n---\n\n## Working Environment\n- Agent workspace: `'+str(workspace)+'`\n- Resolve task and project locations from the agent workspace unless an explicit target says otherwise.\n')
 server=root/'server.py';server.write_text(SERVER)
 log=root/'server.log'
 config=capsule/'.agents'/'mcp_config.json'
 config.write_text(json.dumps({'mcpServers':{'capsule-test':{'command':sys.executable,'args':[str(server)],'env':{'PROBE_LOG':str(log)}}}}))
 args=['agy','--new-project','--agent','capsule-probe','--add-dir',str(workspace),'--model','gemini-3.8-flash-low','--dangerously-skip-permissions','--output-format','stream-json','--print','Use the capsule-test MCP server probe_echo tool and tell me the exact text it returns. Do not invent the marker.']
 p=subprocess.run(args,cwd=capsule,text=True,capture_output=True,timeout=150)
 (OUT/'stdout.jsonl').write_text(p.stdout);(OUT/'stderr.txt').write_text(p.stderr)
 (OUT/'mcp-server-messages.jsonl').write_text(log.read_text() if log.exists() else '')
 ev=[]
 for l in p.stdout.splitlines():
  if l.startswith('{'):
   try:ev.append(json.loads(l))
   except:pass
 result=next((e['result'] for e in reversed(ev) if e.get('event')=='result'),{})
 summary={'exit':p.returncode,'status':result.get('status'),'response':result.get('response'),'serverStarted':log.exists(),'serverMessages':[json.loads(x).get('method') for x in log.read_text().splitlines() if x.startswith('{')] if log.exists() else [],'tools':[(e['step_update'].get('state'),e['step_update'].get('tool_name'),e['step_update'].get('tool_info',{})) for e in ev if e.get('event')=='step_update' and e['step_update'].get('step_type')=='tool'],'stderrTail':p.stderr[-500:]}
 (OUT/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2))
